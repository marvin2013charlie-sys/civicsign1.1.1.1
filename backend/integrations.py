"""Business-plan integrations: API keys, outbound webhooks, programmatic API."""
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, Request

from db import db
from auth import get_current_user
from plan_features import require_business_feature, has_feature
from security_utils import validate_webhook_url
from models import ApiKeyCreate, WebhookUpdate

logger = logging.getLogger("civicsign.integrations")

integrations_router = APIRouter(prefix="/api", tags=["integrations"])
v1_router = APIRouter(prefix="/api/v1", tags=["api-v1"])

WEBHOOK_EVENTS = {
    "envelope.sent", "envelope.signed", "envelope.completed",
    "envelope.declined", "envelope.voided",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _sign_payload(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _require_integrations_manager(user: dict) -> None:
    """API keys and webhooks: Business plan, organisation admin only for org accounts."""
    require_business_feature(user, "api_webhooks")
    if user.get("org_id") and user.get("org_role") != "owner":
        raise HTTPException(
            status_code=403,
            detail="Only the organisation admin can manage API keys and webhooks.",
        )


def _org_member_blocked_for_api(user: dict) -> bool:
    return bool(user.get("org_id")) and user.get("org_role") != "owner"


async def _user_by_api_key(raw_key: str) -> dict | None:
    if not raw_key or len(raw_key) < 20:
        return None
    digest = _hash_key(raw_key)
    user = await db.users.find_one(
        {"api_keys.key_hash": digest, "active": {"$ne": False}},
        {"_id": 0},
    )
    if not user or not has_feature(user, "api_webhooks"):
        return None
    if _org_member_blocked_for_api(user):
        return None
    return user


async def get_api_key_user(
    x_api_key: str = Header(default="", alias="X-API-Key"),
) -> dict:
    user = await _user_by_api_key(x_api_key.strip())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return user


async def emit_webhook(owner_id: str, event: str, payload: dict) -> None:
    """Best-effort outbound webhook for envelope lifecycle events."""
    if event not in WEBHOOK_EVENTS:
        return
    try:
        user = await db.users.find_one({"user_id": owner_id}, {"_id": 0, "webhook": 1})
        if not user or not has_feature(user, "api_webhooks"):
            return
        wh = user.get("webhook") or {}
        if not wh.get("enabled") or not wh.get("url"):
            return
        try:
            validate_webhook_url(wh["url"])
        except HTTPException:
            logger.warning(f"[webhook] blocked unsafe stored URL for owner={owner_id}")
            return
        allowed = set(wh.get("events") or list(WEBHOOK_EVENTS))
        if event not in allowed:
            return
        body = json.dumps({
            "event": event,
            "timestamp": _now(),
            "data": payload,
        }, default=str).encode("utf-8")
        secret = wh.get("secret") or ""
        headers = {"Content-Type": "application/json", "User-Agent": "CivicSign-Webhooks/1.0"}
        if secret:
            headers["X-CivicSign-Signature"] = _sign_payload(secret, body)
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
            await client.post(wh["url"], content=body, headers=headers)
    except Exception as e:
        logger.warning(f"[webhook] delivery failed owner={owner_id} event={event}: {e}")


@integrations_router.get("/me/api-keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    _require_integrations_manager(user)
    keys = user.get("api_keys") or []
    return [{"key_id": k["key_id"], "label": k.get("label", ""), "prefix": k.get("prefix", ""),
             "created_at": k.get("created_at")} for k in keys]


@integrations_router.post("/me/api-keys")
async def create_api_key(body: ApiKeyCreate, user: dict = Depends(get_current_user)):
    _require_integrations_manager(user)
    raw = f"cs_live_{secrets.token_urlsafe(32)}"
    key_id = f"key_{uuid.uuid4().hex[:12]}"
    entry = {
        "key_id": key_id,
        "label": (body.label or "API key")[:80],
        "prefix": raw[:12],
        "key_hash": _hash_key(raw),
        "created_at": _now(),
    }
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"api_keys": entry}},
    )
    return {"key_id": key_id, "api_key": raw, "prefix": entry["prefix"],
            "message": "Copy this key now — it won't be shown again."}


@integrations_router.delete("/me/api-keys/{key_id}")
async def revoke_api_key(key_id: str, user: dict = Depends(get_current_user)):
    _require_integrations_manager(user)
    result = await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"api_keys": {"key_id": key_id}}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"ok": True}


@integrations_router.get("/me/webhook")
async def get_webhook(user: dict = Depends(get_current_user)):
    _require_integrations_manager(user)
    wh = user.get("webhook") or {}
    return {
        "url": wh.get("url"),
        "enabled": bool(wh.get("enabled")),
        "events": wh.get("events") or list(WEBHOOK_EVENTS),
        "has_secret": bool(wh.get("secret")),
    }


@integrations_router.patch("/me/webhook")
async def update_webhook(body: WebhookUpdate, user: dict = Depends(get_current_user)):
    _require_integrations_manager(user)
    wh = dict(user.get("webhook") or {})
    if body.url is not None:
        url = body.url.strip()
        wh["url"] = validate_webhook_url(url) if url else None
    if body.enabled is not None:
        wh["enabled"] = body.enabled
    if body.events is not None:
        invalid = [e for e in body.events if e not in WEBHOOK_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Unknown webhook events: {', '.join(invalid)}")
        wh["events"] = body.events
    if body.regenerate_secret:
        wh["secret"] = secrets.token_urlsafe(24)
    elif "secret" not in wh:
        wh["secret"] = secrets.token_urlsafe(24)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"webhook": wh, "updated_at": _now()}},
    )
    out = {
        "url": wh.get("url"),
        "enabled": bool(wh.get("enabled")),
        "events": wh.get("events") or list(WEBHOOK_EVENTS),
        "has_secret": bool(wh.get("secret")),
    }
    if body.regenerate_secret:
        out["secret"] = wh["secret"]
    return out


@v1_router.get("/envelopes")
async def v1_list_envelopes(
    request: Request,
    user: dict = Depends(get_api_key_user),
):
    """List envelopes via API key (Business plan)."""
    limit = min(100, max(1, int(request.query_params.get("limit", "50"))))
    items = await db.envelopes.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "envelope_id": 1, "title": 1, "status": 1, "created_at": 1, "sent_at": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"envelopes": items, "count": len(items)}