"""Business-plan integrations: API keys, outbound webhooks, programmatic API.

Webhook delivery follows industry patterns (DocuSign Connect, PandaDoc, Adobe Sign):
- HMAC-SHA256 signing on raw body
- Delivery IDs for idempotency
- Automatic retries with backoff
- Delivery log for debugging / replay visibility
"""
import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, Query

from db import db
from auth import get_current_user
from plan_features import require_business_feature, has_feature, owner_has_feature
from security_utils import validate_webhook_url
from models import ApiKeyCreate, WebhookUpdate

logger = logging.getLogger("civicsign.integrations")

integrations_router = APIRouter(prefix="/api", tags=["integrations"])
v1_router = APIRouter(prefix="/api/v1", tags=["api-v1"])

WEBHOOK_API_VERSION = "2026-07-09"

WEBHOOK_EVENTS = {
    "envelope.sent",
    "envelope.viewed",
    "envelope.signed",
    "envelope.completed",
    "envelope.declined",
    "envelope.voided",
}

WEBHOOK_RETRY_DELAYS_SEC = (0, 60, 300)  # immediate, 1 min, 5 min
WEBHOOK_TEST_RETRY_DELAYS_SEC = (0,)  # test ping: single attempt, no long wait
WEBHOOK_DELIVERY_LOG_LIMIT = 100


def _now():
    return datetime.now(timezone.utc).isoformat()


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _sign_payload(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _append_signature_query(url: str, signature: str) -> str:
    """PandaDoc-style optional signature query param for receivers that prefer it."""
    parsed = urlparse(url)
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params["civicsign_signature"] = signature
    return urlunparse(parsed._replace(query=urlencode(params)))


def _build_webhook_body(delivery_id: str, event: str, payload: dict) -> bytes:
    return json.dumps({
        "id": delivery_id,
        "event": event,
        "timestamp": _now(),
        "api_version": WEBHOOK_API_VERSION,
        "data": payload,
    }, default=str).encode("utf-8")


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


async def _record_delivery(
    *,
    delivery_id: str,
    owner_id: str,
    event: str,
    url: str,
    success: bool,
    status_code: int | None,
    attempts: int,
    error: str | None,
    payload: dict,
) -> None:
    entry = {
        "delivery_id": delivery_id,
        "owner_id": owner_id,
        "event": event,
        "url": url,
        "success": success,
        "status_code": status_code,
        "attempts": attempts,
        "error": (error or "")[:500] if error else None,
        "payload": payload,
        "created_at": _now(),
    }
    try:
        await db.webhook_deliveries.insert_one(entry)
        count = await db.webhook_deliveries.count_documents({"owner_id": owner_id})
        if count > WEBHOOK_DELIVERY_LOG_LIMIT:
            oldest = await db.webhook_deliveries.find(
                {"owner_id": owner_id}, {"_id": 1},
            ).sort("created_at", 1).limit(count - WEBHOOK_DELIVERY_LOG_LIMIT).to_list(
                count - WEBHOOK_DELIVERY_LOG_LIMIT,
            )
            if oldest:
                await db.webhook_deliveries.delete_many(
                    {"_id": {"$in": [d["_id"] for d in oldest]}},
                )
    except Exception as e:
        logger.warning(f"[webhook] could not record delivery {delivery_id}: {e}")


async def _post_webhook_once(url: str, body: bytes, headers: dict) -> tuple[bool, int | None, str | None]:
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
            resp = await client.post(url, content=body, headers=headers)
        if 200 <= resp.status_code < 300:
            return True, resp.status_code, None
        return False, resp.status_code, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, None, str(e)


async def deliver_webhook(
    owner_id: str,
    event: str,
    payload: dict,
    *,
    url: str | None = None,
    secret: str | None = None,
    allowed_events: set[str] | None = None,
    is_test: bool = False,
) -> dict:
    """Deliver a webhook with retries. Returns delivery summary."""
    if event not in WEBHOOK_EVENTS:
        raise ValueError(f"Unknown event: {event}")

    if not await owner_has_feature(owner_id, "api_webhooks"):
        return {"delivered": False, "reason": "feature_unavailable"}

    user = await db.users.find_one({"user_id": owner_id}, {"_id": 0})
    if not user:
        return {"delivered": False, "reason": "user_not_found"}

    wh = user.get("webhook") or {}
    target_url = url or wh.get("url")
    if not target_url:
        return {"delivered": False, "reason": "no_url"}
    if not is_test and not wh.get("enabled"):
        return {"delivered": False, "reason": "disabled"}

    try:
        validate_webhook_url(target_url)
    except HTTPException:
        logger.warning(f"[webhook] blocked unsafe URL for owner={owner_id}")
        return {"delivered": False, "reason": "unsafe_url"}

    allowed = allowed_events if allowed_events is not None else set(wh.get("events", WEBHOOK_EVENTS))
    if not is_test and event not in allowed:
        return {"delivered": False, "reason": "event_not_subscribed"}

    delivery_id = f"whd_{uuid.uuid4().hex[:16]}"
    data = dict(payload)
    if is_test:
        data["test"] = True
    body = _build_webhook_body(delivery_id, event, data)
    signing_secret = secret if secret is not None else (wh.get("secret") or "")
    signature = _sign_payload(signing_secret, body) if signing_secret else ""

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "CivicSign-Webhooks/2.0",
        "X-CivicSign-Event": event,
        "X-CivicSign-Delivery-Id": delivery_id,
        "X-CivicSign-API-Version": WEBHOOK_API_VERSION,
    }
    if signature:
        headers["X-CivicSign-Signature"] = signature

    post_url = _append_signature_query(target_url, signature) if signature else target_url

    success = False
    status_code = None
    last_error = None
    attempts = 0
    retry_schedule = WEBHOOK_TEST_RETRY_DELAYS_SEC if is_test else WEBHOOK_RETRY_DELAYS_SEC
    for delay in retry_schedule:
        if delay:
            await asyncio.sleep(delay)
        attempts += 1
        success, status_code, last_error = await _post_webhook_once(post_url, body, headers)
        if success:
            break

    await _record_delivery(
        delivery_id=delivery_id,
        owner_id=owner_id,
        event=event,
        url=target_url,
        success=success,
        status_code=status_code,
        attempts=attempts,
        error=last_error,
        payload=data,
    )
    if not success:
        logger.warning(
            f"[webhook] delivery failed owner={owner_id} event={event} "
            f"attempts={attempts} error={last_error}",
        )
    return {
        "delivered": success,
        "delivery_id": delivery_id,
        "attempts": attempts,
        "status_code": status_code,
        "error": last_error,
    }


async def _emit_webhook_background(owner_id: str, event: str, payload: dict) -> None:
    try:
        await deliver_webhook(owner_id, event, payload)
    except Exception as e:
        logger.warning(f"[webhook] emit failed owner={owner_id} event={event}: {e}")


def emit_webhook(owner_id: str, event: str, payload: dict) -> None:
    """Schedule outbound webhook delivery (retries run in background)."""
    if event not in WEBHOOK_EVENTS:
        return
    asyncio.create_task(_emit_webhook_background(owner_id, event, payload))


def _envelope_api_projection(env: dict) -> dict:
    recipients = []
    for r in env.get("recipients") or []:
        recipients.append({
            "recipient_id": r.get("recipient_id"),
            "name": r.get("name"),
            "email": r.get("email"),
            "role": r.get("role"),
            "status": r.get("status"),
            "order": r.get("order"),
            "signed_at": r.get("signed_at"),
            "viewed_at": r.get("viewed_at"),
        })
    return {
        "envelope_id": env.get("envelope_id"),
        "title": env.get("title"),
        "status": env.get("status"),
        "signing_order": env.get("signing_order"),
        "created_at": env.get("created_at"),
        "sent_at": env.get("sent_at"),
        "updated_at": env.get("updated_at"),
        "completed_at": env.get("completed_at"),
        "recipient_count": len(recipients),
        "recipients": recipients,
    }


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
        "events": wh.get("events", sorted(WEBHOOK_EVENTS)),
        "has_secret": bool(wh.get("secret")),
        "api_version": WEBHOOK_API_VERSION,
        "available_events": sorted(WEBHOOK_EVENTS),
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
    if wh.get("enabled") and not wh.get("url"):
        raise HTTPException(status_code=400, detail="Set a webhook URL before enabling webhooks")
    secret_created = bool(body.regenerate_secret) or not wh.get("secret")
    if secret_created:
        wh["secret"] = secrets.token_urlsafe(24)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"webhook": wh, "updated_at": _now()}},
    )
    out = {
        "url": wh.get("url"),
        "enabled": bool(wh.get("enabled")),
        "events": wh.get("events", sorted(WEBHOOK_EVENTS)),
        "has_secret": bool(wh.get("secret")),
        "api_version": WEBHOOK_API_VERSION,
        "available_events": sorted(WEBHOOK_EVENTS),
    }
    if secret_created:
        out["secret"] = wh["secret"]
    return out


@integrations_router.post("/me/webhook/test")
async def test_webhook(user: dict = Depends(get_current_user)):
    """Send a sample event to the configured endpoint (DocuSign/PandaDoc-style test ping)."""
    _require_integrations_manager(user)
    wh = user.get("webhook") or {}
    if not wh.get("url"):
        raise HTTPException(status_code=400, detail="Set a webhook URL before testing")
    result = await deliver_webhook(
        user["user_id"],
        "envelope.sent",
        {
            "envelope_id": "env_test_sample",
            "title": "CivicSign webhook test",
            "status": "sent",
            "recipient_count": 1,
        },
        is_test=True,
    )
    if not result.get("delivered"):
        raise HTTPException(
            status_code=502,
            detail=result.get("error") or result.get("reason") or "Webhook test delivery failed",
        )
    return result


@integrations_router.get("/me/webhook/deliveries")
async def list_webhook_deliveries(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
):
    _require_integrations_manager(user)
    items = await db.webhook_deliveries.find(
        {"owner_id": user["user_id"]},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"deliveries": items, "count": len(items)}


@integrations_router.get("/me/integrations/docs")
async def integration_docs(user: dict = Depends(get_current_user)):
    """Developer reference for Business-plan integrations."""
    _require_integrations_manager(user)
    base = "/api/v1"
    return {
        "api_version": WEBHOOK_API_VERSION,
        "authentication": {
            "type": "api_key",
            "header": "X-API-Key",
            "format": "cs_live_…",
        },
        "webhooks": {
            "events": sorted(WEBHOOK_EVENTS),
            "signature_header": "X-CivicSign-Signature",
            "signature_algorithm": "HMAC-SHA256 hex digest of raw JSON body",
            "retry_policy": "3 attempts at 0s, 60s, 300s",
            "idempotency_header": "X-CivicSign-Delivery-Id",
        },
        "pagination": {"limit": "1–100 (default 50)", "offset": "0 or greater (default 0)", "status": "Optional envelope status filter"},
        "endpoints": [
            {"method": "GET", "path": f"{base}/envelopes", "description": "List envelopes"},
            {"method": "GET", "path": f"{base}/envelopes/{{envelope_id}}", "description": "Envelope detail"},
            {"method": "GET", "path": f"{base}/envelopes/{{envelope_id}}/status", "description": "Envelope status summary"},
        ],
        "connectors": {
            "zapier": "Use webhooks trigger + REST API with your API key",
            "make": "HTTP module → webhook URL; API key for polling",
            "custom": "Any HTTPS endpoint accepting POST JSON with HMAC verification",
        },
    }


@v1_router.get("/envelopes")
async def v1_list_envelopes(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query(""),
    user: dict = Depends(get_api_key_user),
):
    """List envelopes via API key (Business plan)."""
    status = status.strip().lower()
    query = {"owner_id": user["user_id"]}
    if status:
        query["status"] = status
    items = await db.envelopes.find(
        query,
        {"_id": 0, "envelope_id": 1, "title": 1, "status": 1, "created_at": 1, "sent_at": 1, "updated_at": 1},
    ).sort([("created_at", -1), ("envelope_id", -1)]).skip(offset).limit(limit).to_list(limit)
    return {"envelopes": items, "count": len(items), "offset": offset, "limit": limit}


@v1_router.get("/envelopes/{envelope_id}")
async def v1_get_envelope(envelope_id: str, user: dict = Depends(get_api_key_user)):
    """Envelope detail for integrations (recipients + status, no document bytes)."""
    env = await db.envelopes.find_one(
        {"envelope_id": envelope_id, "owner_id": user["user_id"]},
        {"_id": 0},
    )
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    return _envelope_api_projection(env)


@v1_router.get("/envelopes/{envelope_id}/status")
async def v1_envelope_status(envelope_id: str, user: dict = Depends(get_api_key_user)):
    """Lightweight status poll endpoint (Adobe Sign / PandaDoc style)."""
    env = await db.envelopes.find_one(
        {"envelope_id": envelope_id, "owner_id": user["user_id"]},
        {"_id": 0, "envelope_id": 1, "title": 1, "status": 1, "updated_at": 1, "recipients": 1},
    )
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    signed = sum(1 for r in env.get("recipients") or [] if r.get("status") == "signed")
    total = len(env.get("recipients") or [])
    return {
        "envelope_id": env["envelope_id"],
        "title": env.get("title"),
        "status": env.get("status"),
        "updated_at": env.get("updated_at"),
        "progress": {
            "signed_count": signed,
            "recipient_count": total,
            "all_signed": total > 0 and signed == total,
        },
    }