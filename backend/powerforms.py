"""Public signing links (PowerForms) — share a template URL, collect signer details."""
import uuid
import secrets
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from db import db
from auth import get_current_user
from plan_features import require_feature, has_feature
from rate_limits import limiter
from organizations import enforce_quota, release_envelope_quota

logger = logging.getLogger("civicsign.powerforms")

powerforms_router = APIRouter(prefix="/api", tags=["powerforms"])
public_router = APIRouter(prefix="/api/public", tags=["public-forms"])


def _now():
    return datetime.now(timezone.utc).isoformat()


class PublicFormToggle(BaseModel):
    enabled: bool = True
    title: str | None = Field(None, max_length=120)


class PublicFormSubmit(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    base_url: str | None = None


def _slug() -> str:
    return secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10]


async def _get_template_by_slug(slug: str) -> tuple[dict, dict]:
    tpl = await db.templates.find_one(
        {"public_form.slug": slug, "public_form.enabled": True},
        {"_id": 0},
    )
    if not tpl:
        raise HTTPException(status_code=404, detail="Signing form not found or disabled")
    owner = await db.users.find_one({"user_id": tpl["owner_id"]}, {"_id": 0})
    if not owner or owner.get("active") is False:
        raise HTTPException(status_code=404, detail="Signing form unavailable")
    return tpl, owner


@powerforms_router.patch("/templates/{template_id}/public-form")
@limiter.limit("20/minute")
async def toggle_public_form(
    request: Request, template_id: str, body: PublicFormToggle,
    user: dict = Depends(get_current_user),
):
    require_feature(user, "public_links")
    tpl = await db.templates.find_one(
        {"template_id": template_id, "owner_id": user["user_id"]}, {"_id": 0},
    )
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if len(tpl.get("roles") or []) != 1:
        raise HTTPException(status_code=400, detail="Public links work with single-signer templates only")
    pf = tpl.get("public_form") or {}
    if body.enabled:
        slug = pf.get("slug") or _slug()
        pf = {
            "enabled": True,
            "slug": slug,
            "title": (body.title or tpl.get("name") or "Sign document").strip()[:120],
            "created_at": pf.get("created_at") or _now(),
            "submissions": pf.get("submissions", 0),
        }
    else:
        pf = {"enabled": False, "slug": pf.get("slug"), "submissions": pf.get("submissions", 0)}
    await db.templates.update_one({"template_id": template_id}, {"$set": {"public_form": pf, "updated_at": _now()}})
    fresh = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    return {"public_form": fresh.get("public_form"), "template_id": template_id}


@public_router.get("/forms/{slug}")
@limiter.limit("120/minute")
async def get_public_form(request: Request, slug: str):
    tpl, owner = await _get_template_by_slug(slug)
    pf = tpl["public_form"]
    branding = owner.get("branding") or {}
    return {
        "slug": slug,
        "title": pf.get("title") or tpl.get("name"),
        "description": tpl.get("description") or "",
        "owner_name": owner.get("name") or owner.get("email"),
        "page_count": tpl.get("document", {}).get("page_count", 1),
        "branding": {
            "logo_url": branding.get("logo_url"),
            "accent_color": branding.get("accent_color"),
            "company_name": branding.get("company_name"),
        } if has_feature(owner, "custom_branding") else None,
    }


@public_router.post("/forms/{slug}/start")
@limiter.limit("30/hour")
async def start_public_form(request: Request, slug: str, body: PublicFormSubmit):
    """Create envelope from template and return signing URL (DocuSign PowerForm-style)."""
    tpl, owner = await _get_template_by_slug(slug)
    credits = await enforce_quota(owner, count=1)

    from server import copy_gridfs, build_envelope_from_template, now_iso, can_sign
    import email_service

    if len(tpl.get("roles") or []) != 1:
        await release_envelope_quota(owner, count=1, credits_consumed=credits)
        raise HTTPException(status_code=400, detail="Invalid form configuration")

    role_id = tpl["roles"][0]["role_id"]
    env_id = f"env_{uuid.uuid4().hex[:16]}"
    envelope_created = False
    try:
        new_file = await copy_gridfs(
            tpl["document"]["file_id"],
            tpl["document"]["original_filename"],
            "template", tpl["template_id"],
            "envelope", env_id,
        )
        env = build_envelope_from_template(
            tpl, owner, new_file,
            {role_id: {"name": body.name.strip(), "email": body.email.lower().strip()}},
            envelope_id=env_id,
        )
        env["status"] = "sent"
        env["sent_at"] = now_iso()
        env["message"] = f"Please sign «{tpl.get('name', 'document')}»."
        env["source"] = "public_form"
        env["public_form_slug"] = slug
        from signature_levels import resolve_send_signature_level
        env["signature_level"] = resolve_send_signature_level(owner, None)
        env["audit_events"].append({
            "at": now_iso(),
            "actor": body.email,
            "action": "Started via public link",
            "ip": request.client.host if request.client else None,
            "detail": f"Form slug {slug}",
        })
        await db.envelopes.insert_one(dict(env))
        envelope_created = True

        await db.templates.update_one(
            {"template_id": tpl["template_id"]},
            {"$inc": {"use_count": 1, "public_form.submissions": 1}},
        )

        from security_utils import validate_redirect_base
        origin_hdr = str(request.headers.get("origin", "")).strip()
        if body.base_url or origin_hdr:
            base = validate_redirect_base(body.base_url or "", fallback=origin_hdr)
        else:
            base = ""
        rcp = env["recipients"][0]
        sign_url = f"{base}/sign/{rcp['access_token']}" if base else f"/sign/{rcp['access_token']}"
        if can_sign(env, rcp) and base:
            email_service.send_signing_invite(
                rcp["email"], rcp["name"], env["owner_name"], env["title"], sign_url, env.get("message"))

        return {
            "envelope_id": env["envelope_id"],
            "sign_url": sign_url,
            "message": "Redirecting you to sign…",
        }
    except Exception:
        if not envelope_created:
            await release_envelope_quota(owner, count=1, credits_consumed=credits)
        raise