"""Organization-level shared document quotas (e.g. bank / enterprise clients)."""
import os
import secrets
import uuid
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response as FastResponse
from rate_limits import limiter, poll_limit

from db import db, upload_file, download_file, delete_file
from auth import get_current_user, require_admin, hash_password, _validate_password_strength
from plan_signing import generate_plan_signature as _generate_plan_signature
from models import (
    OrganizationCreate, OrganizationUpdate,
    OrgMemberCreate, OrgMemberPasswordReset, OrgMemberStatusUpdate,
    OrgMemberQuotaUpdate,
)
from plan_features import (
    current_month_envelope_count, get_hourly_burst_limit,
    PLAN_MONTHLY_QUOTA, _effective_plan, BUSINESS_FAIR_USE_DEFAULT,
)

logger = logging.getLogger("civicsign.organizations")

org_router = APIRouter(prefix="/api", tags=["organizations"])
admin_org_router = APIRouter(prefix="/api/admin", tags=["admin-organizations"])

ORG_SEAT_MONTHLY_LIMIT = 500
ORG_CONTRACT_MAX_BYTES = 25 * 1024 * 1024
ORG_PRICING_NOTE = (
    "Organisation plan: up to 500 documents per seat per month. "
    "Contract pricing is agreed with your account manager — contact info@civicbot.co.uk to discuss rates."
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _contract_public_meta(org: dict, *, for_admin: bool = False) -> dict | None:
    """Contract file metadata. Customer portal omits internal uploader ids."""
    file_id = org.get("contract_file_id")
    if not file_id:
        return None
    content_type = org.get("contract_content_type") or "application/pdf"
    filename = org.get("contract_filename") or "organisation-contract.pdf"
    meta = {
        "filename": filename,
        "content_type": content_type,
        "uploaded_at": org.get("contract_uploaded_at"),
        "version": file_id,
        "is_pdf": content_type == "application/pdf" or filename.lower().endswith(".pdf"),
    }
    if for_admin:
        meta["uploaded_by"] = org.get("contract_uploaded_by")
    return meta


def _pdf_marker_offset(raw: bytes) -> int:
    """Many exporters prepend bytes before %PDF — find the real header."""
    return raw.find(b"%PDF", 0, min(len(raw), 8192))


def _prepare_contract_upload(raw: bytes, filename: str) -> tuple[bytes, str, str]:
    """
    Accept PDF or DOCX, normalize through PyMuPDF so pdf.js can render reliably.
    Returns (pdf_bytes, content_type, safe_filename).
    """
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file — choose a PDF or Word document")
    if len(raw) > ORG_CONTRACT_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Contract must be under 25 MB")

    safe_name = (filename or "contract").strip() or "contract"
    lower = safe_name.lower()
    pdf_at = _pdf_marker_offset(raw)
    is_docx = raw[:4] == b"PK\x03\x04" and lower.endswith(".docx")

    if is_docx and pdf_at < 0:
        from pdf_service import convert_docx_to_pdf_bytes
        try:
            raw = convert_docx_to_pdf_bytes(raw)
        except RuntimeError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        pdf_at = _pdf_marker_offset(raw)
        stem = safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name
        safe_name = f"{stem}.pdf"

    if pdf_at < 0:
        if lower.endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="This file is not a valid PDF. Re-export it from Word or Preview and try again.",
            )
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF or Word (.docx) contract file",
        )

    if pdf_at > 0:
        raw = raw[pdf_at:]

    from pdf_service import normalize_pdf_viewbox, get_pdf_info
    import fitz

    def _validate_pdf(data: bytes) -> None:
        doc = fitz.open(stream=data, filetype="pdf")
        if doc.page_count < 1:
            doc.close()
            raise ValueError("empty pdf")
        doc.close()
        get_pdf_info(data)

    try:
        raw = normalize_pdf_viewbox(raw)
        try:
            _validate_pdf(raw)
        except Exception:
            # Light rewrite only when the original bytes fail validation (avoids corrupting legal PDFs)
            doc = fitz.open(stream=raw, filetype="pdf")
            raw = doc.tobytes(garbage=2, deflate=True)
            doc.close()
            _validate_pdf(raw)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"[org] contract pdf prepare failed: {exc}")
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Save/export it again as PDF and re-upload.",
        ) from exc

    if not lower.endswith(".pdf"):
        stem = safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name
        safe_name = f"{stem}.pdf"

    return raw, "application/pdf", safe_name


async def _clear_contract_meta(org_id: str) -> None:
    """Drop stale contract pointers when GridFS no longer has the file."""
    await db.organizations.update_one(
        {"org_id": org_id},
        {
            "$unset": {
                "contract_file_id": "",
                "contract_filename": "",
                "contract_content_type": "",
                "contract_uploaded_at": "",
                "contract_uploaded_by": "",
            },
            "$set": {"updated_at": _now()},
        },
    )


async def _read_contract_file(org_id: str) -> tuple[bytes, str, str, str]:
    """Always load the latest contract file_id from the database (never a stale org dict)."""
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    file_id = org.get("contract_file_id")
    if not file_id:
        raise HTTPException(status_code=404, detail="No contract document uploaded for this organisation")
    try:
        data = await download_file(file_id)
    except FileNotFoundError:
        logger.warning(f"[org] contract GridFS missing org={org_id} file={file_id}")
        await _clear_contract_meta(org_id)
        raise HTTPException(
            status_code=404,
            detail="Contract file is missing — please ask your account manager to re-upload it",
        )
    if not data:
        await delete_file(file_id)
        await _clear_contract_meta(org_id)
        raise HTTPException(
            status_code=404,
            detail="Contract file is empty — please ask your account manager to re-upload it",
        )
    filename = org.get("contract_filename") or "organisation-contract.pdf"
    content_type = org.get("contract_content_type") or "application/pdf"
    return data, filename, content_type, file_id


def _contract_download_response(
    data: bytes,
    filename: str,
    content_type: str,
    *,
    inline: bool,
    file_id: str,
) -> FastResponse:
    disposition = "inline" if inline else "attachment"
    safe = filename.replace('"', "'")
    return FastResponse(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'{disposition}; filename="{safe}"',
            "Cache-Control": "private, no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "ETag": f'"{file_id}"',
        },
    )


def org_member_seat_limit(user: dict, org: dict) -> int:
    """Effective monthly document cap for an organisation member (owner override or org default)."""
    org_cap = org_seat_monthly_limit(org)
    custom = user.get("monthly_seat_limit")
    if isinstance(custom, int) and custom > 0:
        return min(custom, org_cap)
    return org_cap


def _public_org_member(doc: dict, *, org: dict | None = None, seat_used: int | None = None) -> dict:
    out = {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "org_role": doc.get("org_role", "member"),
        "plan": doc.get("plan", "business"),
        "active": doc.get("active", True),
        "created_at": doc.get("created_at"),
        "monthly_seat_limit": doc.get("monthly_seat_limit"),
    }
    if org is not None:
        effective = org_member_seat_limit(doc, org)
        org_default = org_seat_monthly_limit(org)
        out["seat_limit"] = effective
        out["seat_limit_custom"] = (
            isinstance(doc.get("monthly_seat_limit"), int)
            and doc["monthly_seat_limit"] > 0
            and effective != org_default
        )
        out["org_per_seat_limit"] = org_default
    if seat_used is not None:
        out["seat_used"] = seat_used
        if org is not None:
            out["seat_remaining"] = max(0, out.get("seat_limit", 0) - seat_used)
    return out


async def _member_usage_map(org_id: str, member_ids: list[str]) -> dict[str, int]:
    from usage_ledger import get_monthly_usage, resolve_org_period

    if not member_ids:
        return {}
    period = await resolve_org_period(org_id)
    out: dict[str, int] = {}
    for uid in member_ids:
        out[uid] = await get_monthly_usage(uid, period)
    return out


async def _is_org_owner(user: dict, org: dict) -> bool:
    if user.get("org_role") == "owner":
        return True
    owner_id = org.get("owner_user_id")
    return bool(owner_id and user.get("user_id") == owner_id)


async def require_org_admin(user: dict = Depends(get_current_user)) -> dict:
    """Organisation owner — can provision logins for their org."""
    if user.get("role") in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Use the admin portal to manage organisations")
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="No organisation linked to this account")
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=403, detail="Organisation not found")
    if not await _is_org_owner(user, org):
        raise HTTPException(status_code=403, detail="Only the organisation admin can manage team accounts")
    enriched = dict(user)
    enriched["_org"] = org
    return enriched


async def _provision_org_user(
    *,
    email: str,
    name: str,
    password: str,
    org_id: str,
    org_name: str,
    org_role: str,
    created_by: str,
) -> dict:
    email = email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    is_valid, err = _validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)
    user_id = f"user_{secrets.token_hex(8)}"
    plan_updated_at = _now()
    user = {
        "user_id": user_id,
        "email": email,
        "name": name.strip(),
        "password_hash": hash_password(password),
        "auth_provider": "password",
        "role": "user",
        "plan": "business",
        "org_id": org_id,
        "org_role": org_role,
        "active": True,
        "email_verified": True,
        "plan_upgraded_via_payment": True,
        "plan_updated_at": plan_updated_at,
        "plan_signature": _generate_plan_signature(user_id, "business", plan_updated_at),
        "created_at": plan_updated_at,
        "created_by": created_by,
        "company": org_name[:120],
        "picture": None,
    }
    await db.users.insert_one(user)
    return user


async def org_member_ids(org_id: str) -> list[str]:
    users = await db.users.find(
        {"org_id": org_id, "active": {"$ne": False}},
        {"user_id": 1, "_id": 0},
    ).to_list(5000)
    return [u["user_id"] for u in users]


async def current_month_org_envelope_count(org_id: str, period: dict | None = None) -> int:
    members = await org_member_ids(org_id)
    if not members:
        return 0
    from usage_ledger import get_org_monthly_usage, resolve_org_period
    if period is None:
        period = await resolve_org_period(org_id)
    return await get_org_monthly_usage(members, org_id, period)


async def hourly_org_envelope_count(org_id: str) -> int:
    members = await org_member_ids(org_id)
    if not members:
        return 0
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    return await db.envelopes.count_documents({
        "owner_id": {"$in": members},
        "created_at": {"$gte": one_hour_ago},
    })


def org_seat_monthly_limit(org: dict) -> int:
    """Per-login monthly cap for organisation members."""
    custom = org.get("per_seat_limit")
    if isinstance(custom, int) and custom > 0:
        return custom
    return int(os.environ.get("ORG_SEAT_MONTHLY_LIMIT", str(ORG_SEAT_MONTHLY_LIMIT)))


def org_monthly_limit(org: dict, member_count: int = 1) -> int:
    """Shared organisation pool cap (defaults to seats × per-seat allowance)."""
    if org.get("enterprise_unlimited"):
        return -1
    custom = org.get("monthly_envelope_limit")
    if isinstance(custom, int) and custom > 0:
        return custom
    return org_seat_monthly_limit(org) * max(1, member_count)


async def get_org_for_user(user: dict) -> dict | None:
    org_id = user.get("org_id")
    if not org_id:
        return None
    return await db.organizations.find_one({"org_id": org_id}, {"_id": 0})


async def _extra_document_credits(user_id: str) -> int:
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "extra_document_credits": 1})
    if not doc:
        return 0
    return max(0, int(doc.get("extra_document_credits") or 0))


def purchase_options_for_plan(plan: str, at_limit: bool, scope: str = "user") -> dict:
    """Upgrade / pay-as-you-go choices shown when monthly quota is exhausted."""
    if not at_limit:
        return {}
    if scope == "organization":
        return {"contact_support": True}
    if scope != "user":
        return {}
    options: dict = {"buy_single_document_gbp": 1.0}
    if plan == "free":
        options["upgrade_pro"] = True
        options["upgrade_pro_amount_gbp"] = 15.0
    elif plan == "pro":
        options["upgrade_business"] = True
    else:
        options["contact_support"] = True
    return options


def _quota_exceeded_detail(
    *,
    message: str,
    used: int,
    limit: int,
    plan: str,
    scope: str = "user",
) -> dict:
    at_limit = limit > 0 and used >= limit
    options = purchase_options_for_plan(plan, at_limit, scope)
    return {
        "message": message,
        "code": "quota_exceeded",
        "plan": plan,
        "used": used,
        "limit": limit,
        "at_limit": at_limit,
        "rate_limited": at_limit,
        "scope": scope,
        "options": options,
    }


async def release_envelope_quota(user: dict, count: int = 1, credits_consumed: int = 0) -> None:
    """Rollback quota after a failed envelope create."""
    from usage_ledger import release_user_quota, release_org_quota, resolve_org_period, resolve_user_period

    user_period = await resolve_user_period(user["user_id"])
    org = await get_org_for_user(user)
    if org:
        org_period = await resolve_org_period(org["org_id"])
        await release_org_quota(org["org_id"], count, org_period)
    await release_user_quota(user["user_id"], count, credits_consumed, user_period)


def _period_fields(period: dict) -> dict:
    return {
        "month": period["label"],
        "period_label": period["label"],
        "period_start": period["period_start_iso"],
        "period_end": period["period_end_iso"],
        "resets_at": period["resets_at"],
        "resets_label": period["resets_label"],
        "billing_cycle": period["billing_cycle"],
    }


async def resolve_usage_quota(user: dict) -> dict:
    """
    Single source of truth for quota enforcement and /usage display.
    Organization pool wins when user.org_id is set.
    """
    from usage_ledger import resolve_org_period, resolve_user_period

    plan = _effective_plan(user)
    user_period = await resolve_user_period(user["user_id"])
    personal_used = await current_month_envelope_count(user["user_id"], user_period)

    org = await get_org_for_user(user)
    if org:
        org_id = org["org_id"]
        org_period = await resolve_org_period(org_id)
        member_count = len(await org_member_ids(org_id))
        seat_limit = org_member_seat_limit(user, org)
        org_limit = org_monthly_limit(org, member_count)
        org_used = await current_month_org_envelope_count(org_id, org_period)
        org_unlimited = org_limit < 0
        seat_remaining = max(0, seat_limit - personal_used)
        seat_percent = min(100, round((personal_used / seat_limit) * 100) if seat_limit else 0)
        seat_at_limit = personal_used >= seat_limit
        org_at_limit = not org_unlimited and org_used >= org_limit
        at_limit = seat_at_limit or org_at_limit
        note = (
            f"Your seat: {personal_used:,} / {seat_limit:,} documents this month. "
            f"Organisation «{org['name']}» pool: {org_used:,}"
            f"{'' if org_unlimited else f' / {org_limit:,}'} across {member_count} seat"
            f"{'s' if member_count != 1 else ''}. {ORG_PRICING_NOTE}"
        )
        return {
            "scope": "organization",
            "plan": plan,
            **_period_fields(org_period),
            "used": personal_used,
            "personal_used": personal_used,
            "limit": seat_limit,
            "seat_limit": seat_limit,
            "seat_used": personal_used,
            "seat_remaining": seat_remaining,
            "org_used": org_used,
            "org_limit": org_limit,
            "org_unlimited": org_unlimited,
            "unlimited": False,
            "remaining": seat_remaining,
            "percent": seat_percent,
            "at_limit": at_limit,
            "rate_limited": at_limit,
            "seat_at_limit": seat_at_limit,
            "org_at_limit": org_at_limit,
            "extra_document_credits": 0,
            "enterprise_unlimited": bool(org.get("enterprise_unlimited")),
            "fair_use": False,
            "contract_limit": org.get("monthly_envelope_limit"),
            "quota_note": note,
            "pricing_note": ORG_PRICING_NOTE,
            "hourly_burst_limit": get_hourly_burst_limit(user),
            "purchase_options": purchase_options_for_plan(plan, at_limit, "organization"),
            "organization": {
                "org_id": org_id,
                "name": org.get("name"),
                "member_count": member_count,
                "seat_limit": seat_limit,
            },
        }

    # Per-user quota (existing logic)
    from plan_features import get_monthly_envelope_limit, is_enterprise_unlimited, quota_context

    ctx = quota_context(user)
    limit = ctx["limit"]
    unlimited = ctx["unlimited"]
    remaining = None if unlimited else max(0, limit - personal_used)
    percent = 0 if unlimited else min(100, round((personal_used / limit) * 100) if limit else 0)
    at_limit = not unlimited and personal_used >= limit
    credits = await _extra_document_credits(user["user_id"])
    return {
        "scope": "user",
        "plan": plan,
        **_period_fields(user_period),
        "used": personal_used,
        "personal_used": personal_used,
        "limit": limit,
        "unlimited": unlimited,
        "remaining": remaining,
        "percent": percent,
        "at_limit": at_limit,
        "rate_limited": at_limit,
        "extra_document_credits": credits,
        "enterprise_unlimited": ctx["enterprise_unlimited"],
        "fair_use": ctx["fair_use"],
        "contract_limit": ctx["contract_limit"],
        "quota_note": ctx["quota_note"],
        "hourly_burst_limit": get_hourly_burst_limit(user),
        "purchase_options": purchase_options_for_plan(plan, at_limit, "user"),
        "organization": None,
    }


async def enforce_quota(user: dict, count: int = 1) -> int:
    """
    Atomically reserve burst + monthly quota (org pool or per-user).
    Returns credits consumed (for rollback via release_envelope_quota on failure).
    """
    from usage_ledger import (
        reserve_user_quota, reserve_org_quota, release_user_quota, _inc_ledger,
        resolve_org_period, resolve_user_period,
    )

    if count < 1:
        return 0

    org = await get_org_for_user(user)
    if org:
        org_period = await resolve_org_period(org["org_id"])
        user_period = await resolve_user_period(user["user_id"])
        hourly_cap = int(os.environ.get("ORG_HOURLY_BURST", "500"))
        recent = await hourly_org_envelope_count(org["org_id"])
        if recent + count > hourly_cap:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Your organisation is sending too fast ({hourly_cap}/hour limit). "
                    "Spread bulk jobs over time or contact support for higher throughput."
                ),
            )
        seat_limit = org_member_seat_limit(user, org)
        seat_reserved = False
        if seat_limit > 0:
            seat_result = await reserve_user_quota(
                user["user_id"], seat_limit, count, org_id=org["org_id"], period=user_period,
            )
            if seat_result < 0:
                personal_used = await current_month_envelope_count(user["user_id"], user_period)
                raise HTTPException(
                    status_code=402,
                    detail=_quota_exceeded_detail(
                        message=(
                            f"You've reached your organisation seat limit of {seat_limit:,} documents "
                            "this billing period. Deleting documents does not restore your allowance. "
                            "Contact info@civicbot.co.uk to discuss your contract."
                        ),
                        used=personal_used,
                        limit=seat_limit,
                        plan=_effective_plan(user),
                        scope="organization",
                    ),
                )
            if seat_result > 0:
                await release_user_quota(user["user_id"], count, seat_result, user_period)
                raise HTTPException(
                    status_code=402,
                    detail=_quota_exceeded_detail(
                        message=(
                            f"You've reached your organisation seat limit of {seat_limit:,} documents "
                            "this billing period. Organisation accounts cannot buy extra documents "
                            "online — contact info@civicbot.co.uk to discuss your contract."
                        ),
                        used=await current_month_envelope_count(user["user_id"], user_period),
                        limit=seat_limit,
                        plan=_effective_plan(user),
                        scope="organization",
                    ),
                )
            seat_reserved = True

        member_count = len(await org_member_ids(org["org_id"]))
        org_limit = org_monthly_limit(org, member_count)
        if org_limit >= 0:
            ok = await reserve_org_quota(org["org_id"], org_limit, count, org_period)
            if not ok:
                if seat_reserved:
                    await release_user_quota(user["user_id"], count, 0, user_period)
                org_used = await current_month_org_envelope_count(org["org_id"], org_period)
                raise HTTPException(
                    status_code=402,
                    detail=_quota_exceeded_detail(
                        message=(
                            f"Organisation «{org['name']}» has used its shared pool of "
                            f"{org_limit:,} documents this billing period. Contact info@civicbot.co.uk "
                            "to discuss your contract."
                        ),
                        used=org_used,
                        limit=org_limit,
                        plan=_effective_plan(user),
                        scope="organization",
                    ),
                )
        elif not seat_reserved:
            await _inc_ledger(user["user_id"], count, org_period, org_id=org["org_id"])
        return 0

    from plan_features import get_monthly_envelope_limit

    hourly_cap = get_hourly_burst_limit(user)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.envelopes.count_documents({
        "owner_id": user["user_id"],
        "created_at": {"$gte": one_hour_ago},
    })
    if recent + count > hourly_cap:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Sending too fast — limit is {hourly_cap} documents per hour on this account. "
                "Join an organisation pool or contact us for enterprise throughput."
            ),
        )

    user_period = await resolve_user_period(user["user_id"])
    limit = get_monthly_envelope_limit(user)
    used = await current_month_envelope_count(user["user_id"], user_period)
    plan = _effective_plan(user)

    credits = await reserve_user_quota(
        user["user_id"], limit, count, org_id=user.get("org_id"), period=user_period,
    )
    if credits >= 0:
        return credits

    if plan == "business":
        msg = (
            f"You've used your included Business allocation of {limit:,} documents this billing period. "
            "Deleting documents does not restore your allowance. Upgrade your allocation, "
            "buy an extra document for £1, or contact info@civicbot.co.uk."
        )
    else:
        msg = (
            f"You've reached your {plan.capitalize()} plan limit of {limit} documents for this billing period. "
            "Deleting documents does not restore your allowance. Upgrade to Pro or buy one "
            "extra document for £1."
        )
    raise HTTPException(
        status_code=402,
        detail=_quota_exceeded_detail(
            message=msg,
            used=used,
            limit=limit,
            plan=plan,
            scope="user",
        ),
    )


def _org_portal_payload(user: dict, org: dict, usage: dict, *, is_owner: bool) -> dict:
    from plan_features import plan_features

    seat_limit = usage.get("seat_limit", usage["limit"])
    seat_used = usage.get("seat_used", usage["used"])
    org_limit = usage.get("org_limit")
    org_used = usage.get("org_used", 0)
    org_unlimited = usage.get("org_unlimited", False)
    per_seat = org_seat_monthly_limit(org)

    return {
        "organization": {
            "org_id": org["org_id"],
            "name": org["name"],
            "is_owner": is_owner,
            "your_role": user.get("org_role") or ("owner" if is_owner else "member"),
            "member_count": usage["organization"]["member_count"],
            "per_seat_limit": per_seat,
            "seat_limit": seat_limit,
            "seat_used": seat_used,
            "seat_remaining": max(0, seat_limit - seat_used),
            "org_limit": org_limit,
            "org_used": org_used,
            "org_remaining": None if org_unlimited else max(0, (org_limit or 0) - org_used),
            "org_unlimited": org_unlimited,
            "enterprise_unlimited": bool(org.get("enterprise_unlimited")),
            "contract_pool_limit": org.get("monthly_envelope_limit"),
            "your_contribution": usage["personal_used"],
            "quota_note": usage["quota_note"],
            "pricing_note": usage.get("pricing_note", ORG_PRICING_NOTE),
            "resets_label": usage.get("resets_label"),
            "period_label": usage.get("period_label"),
            "contract": _contract_public_meta(org),
        },
        "usage": {
            "at_limit": usage.get("at_limit", False),
            "seat_at_limit": usage.get("seat_at_limit", False),
            "org_at_limit": usage.get("org_at_limit", False),
            "seat_percent": usage.get("percent", 0),
            "hourly_burst_limit": int(os.environ.get("ORG_HOURLY_BURST", "500")),
        },
        "features": plan_features(user),
        "can_manage_team": is_owner,
    }


@org_router.get("/me/organization")
async def my_organization(user: dict = Depends(get_current_user)):
    org = await get_org_for_user(user)
    if not org:
        return {"organization": None}
    usage = await resolve_usage_quota(user)
    is_owner = await _is_org_owner(user, org)
    payload = _org_portal_payload(user, org, usage, is_owner=is_owner)
    return {"organization": payload["organization"]}


@org_router.get("/org/portal")
@limiter.limit(poll_limit())
async def org_portal(request: Request, user: dict = Depends(get_current_user)):
    """Organisation customer portal — usage, contract limits, features."""
    org = await get_org_for_user(user)
    if not org:
        raise HTTPException(status_code=404, detail="No organisation linked to this account")
    usage = await resolve_usage_quota(user)
    is_owner = await _is_org_owner(user, org)
    payload = _org_portal_payload(user, org, usage, is_owner=is_owner)

    roster = await db.users.find(
        {"org_id": org["org_id"]},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(500)
    usage_map = await _member_usage_map(org["org_id"], [m["user_id"] for m in roster])
    payload["team"] = [
        _public_org_member(m, org=org, seat_used=usage_map.get(m["user_id"], 0))
        for m in roster
    ]
    payload["organization"]["org_per_seat_limit"] = org_seat_monthly_limit(org)
    return payload


@org_router.get("/org/contract")
@limiter.limit(poll_limit("180/minute"))
async def download_org_contract(
    request: Request,
    user: dict = Depends(get_current_user),
    inline: bool = Query(False),
):
    """Download or view the signed organisation contract (all org members)."""
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=404, detail="No organisation linked to this account")
    data, filename, content_type, file_id = await _read_contract_file(org_id)
    return _contract_download_response(
        data,
        filename,
        content_type,
        inline=inline and content_type == "application/pdf",
        file_id=file_id,
    )


@org_router.get("/org/team-roster")
@limiter.limit(poll_limit())
async def org_team_roster(request: Request, user: dict = Depends(get_current_user)):
    """Read-only team list for organisation members."""
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=404, detail="No organisation linked to this account")
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0, "name": 1})
    members = await db.users.find(
        {"org_id": org_id},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(500)
    is_owner = await _is_org_owner(user, org or {})
    full_org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0}) if org_id else None
    usage_map = await _member_usage_map(org_id, [m["user_id"] for m in members]) if org_id else {}
    return {
        "organization_name": (org or {}).get("name"),
        "can_manage": is_owner,
        "members": [
            _public_org_member(
                m,
                org=full_org,
                seat_used=usage_map.get(m["user_id"], 0) if full_org else None,
            )
            for m in members
        ],
    }


@org_router.get("/org/members")
@limiter.limit(poll_limit())
async def list_org_members(request: Request, owner: dict = Depends(require_org_admin)):
    org = owner["_org"]
    org_id = owner["org_id"]
    members = await db.users.find(
        {"org_id": org_id},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(500)
    usage_map = await _member_usage_map(org_id, [m["user_id"] for m in members])
    return [
        _public_org_member(m, org=org, seat_used=usage_map.get(m["user_id"], 0))
        for m in members
    ]


@org_router.post("/org/members")
@limiter.limit("20/minute")
async def create_org_member(
    request: Request,
    body: OrgMemberCreate,
    owner: dict = Depends(require_org_admin),
):
    org = owner["_org"]
    member_count = await db.users.count_documents({"org_id": org["org_id"]})
    if member_count >= 500:
        raise HTTPException(status_code=400, detail="Organisation member limit reached (500)")
    member = await _provision_org_user(
        email=body.email,
        name=body.name,
        password=body.password,
        org_id=org["org_id"],
        org_name=org["name"],
        org_role="member",
        created_by=owner["user_id"],
    )
    logger.info(
        f"[org] member created {member['user_id']} org={org['org_id']} by {owner['email']}"
    )
    return _public_org_member(member)


@org_router.patch("/org/members/{user_id}/quota")
@limiter.limit("20/minute")
async def update_org_member_quota(
    request: Request,
    user_id: str,
    body: OrgMemberQuotaUpdate,
    owner: dict = Depends(require_org_admin),
):
    """Organisation owner sets a per-member monthly document allowance (cannot exceed org per-seat cap)."""
    org = owner["_org"]
    target = await db.users.find_one({"user_id": user_id, "org_id": owner["org_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Team member not found")
    if target.get("org_role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot change the organisation owner's seat allowance")
    org_cap = org_seat_monthly_limit(org)
    if body.monthly_seat_limit is not None and body.monthly_seat_limit > org_cap:
        raise HTTPException(
            status_code=400,
            detail=f"Per-member limit cannot exceed your organisation allowance of {org_cap:,} documents per seat",
        )
    if body.monthly_seat_limit is None:
        await db.users.update_one(
            {"user_id": user_id},
            {"$unset": {"monthly_seat_limit": ""}, "$set": {"updated_at": _now()}},
        )
    else:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"monthly_seat_limit": body.monthly_seat_limit, "updated_at": _now()}},
        )
    fresh = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    usage_map = await _member_usage_map(org["org_id"], [user_id])
    logger.info(
        f"[org] quota updated user={user_id} limit={body.monthly_seat_limit} "
        f"org={org['org_id']} by {owner['email']}"
    )
    return _public_org_member(fresh, org=org, seat_used=usage_map.get(user_id, 0))


@org_router.patch("/org/members/{user_id}/status")
@limiter.limit("20/minute")
async def update_org_member_status(
    request: Request,
    user_id: str,
    body: OrgMemberStatusUpdate,
    owner: dict = Depends(require_org_admin),
):
    target = await db.users.find_one({"user_id": user_id, "org_id": owner["org_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Team member not found")
    if target.get("org_role") == "owner" or target["user_id"] == owner["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot change status of the organisation owner")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"active": body.active, "updated_at": _now()}},
    )
    fresh = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return _public_org_member(fresh)


@org_router.post("/org/members/{user_id}/reset-password")
@limiter.limit("10/minute")
async def reset_org_member_password(
    request: Request,
    user_id: str,
    body: OrgMemberPasswordReset,
    owner: dict = Depends(require_org_admin),
):
    target = await db.users.find_one({"user_id": user_id, "org_id": owner["org_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Team member not found")
    if target.get("org_role") == "owner":
        raise HTTPException(status_code=400, detail="Use account settings to change the owner password")
    is_valid, err = _validate_password_strength(body.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": hash_password(body.password), "updated_at": _now()}},
    )
    return {"ok": True, "email": target["email"]}


@admin_org_router.get("/organizations")
@limiter.limit(poll_limit())
async def list_organizations(request: Request, admin: dict = Depends(require_admin)):
    orgs = await db.organizations.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    out = []
    for org in orgs:
        members = await org_member_ids(org["org_id"])
        used = await current_month_org_envelope_count(org["org_id"])
        member_count = len(members)
        limit = org_monthly_limit(org, member_count)
        contract = _contract_public_meta(org, for_admin=True)
        out.append({
            **org,
            "member_count": member_count,
            "per_seat_limit": org_seat_monthly_limit(org),
            "used_this_month": used,
            "monthly_limit": limit,
            "unlimited": limit < 0,
            "contract": contract,
            "has_contract": contract is not None,
        })
    return out


@admin_org_router.post("/organizations")
@limiter.limit("10/minute")
async def create_organization(request: Request, body: OrganizationCreate,
                              admin: dict = Depends(require_admin)):
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organisation name is required")
    org_id = f"org_{uuid.uuid4().hex[:14]}"
    owner = await _provision_org_user(
        email=body.owner_email,
        name=body.owner_name,
        password=body.owner_password,
        org_id=org_id,
        org_name=name,
        org_role="owner",
        created_by=admin["user_id"],
    )
    org = {
        "org_id": org_id,
        "name": name[:120],
        "monthly_envelope_limit": body.monthly_envelope_limit if body.monthly_envelope_limit and body.monthly_envelope_limit > 0 else None,
        "enterprise_unlimited": bool(body.enterprise_unlimited),
        "owner_user_id": owner["user_id"],
        "contact_email": owner["email"],
        "per_seat_limit": ORG_SEAT_MONTHLY_LIMIT,
        "created_at": _now(),
        "created_by": admin["user_id"],
    }
    try:
        await db.organizations.insert_one(dict(org))
    except Exception:
        await db.users.delete_one({"user_id": owner["user_id"]})
        raise
    org.pop("_id", None)
    logger.info(
        f"[admin] org created {org['org_id']} name={name} owner={owner['email']} by {admin['email']}"
    )
    return {
        **org,
        "owner": _public_org_member(owner),
        "member_count": 1,
    }


@admin_org_router.post("/organizations/{org_id}/contract")
@limiter.limit("10/minute")
async def upload_org_contract(
    request: Request,
    org_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    """Upload or replace the signed contract for an organisation."""
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    raw = await file.read()
    pdf_bytes, content_type, filename = _prepare_contract_upload(raw, file.filename or "contract.pdf")
    old_id = org.get("contract_file_id")
    file_id = await upload_file(pdf_bytes, filename, content_type)
    try:
        stored = await download_file(file_id)
        if len(stored) < 1:
            raise ValueError("empty contract file")
    except Exception as exc:
        await delete_file(file_id)
        logger.error(f"[org] contract verify failed org={org_id} file={file_id}: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Contract could not be saved — please try uploading again",
        ) from exc
    uploaded_at = _now()
    await db.organizations.update_one(
        {"org_id": org_id},
        {"$set": {
            "contract_file_id": file_id,
            "contract_filename": filename,
            "contract_content_type": content_type,
            "contract_uploaded_at": uploaded_at,
            "contract_uploaded_by": admin["user_id"],
            "updated_at": uploaded_at,
        }},
    )
    if old_id and old_id != file_id:
        await delete_file(old_id)
    logger.info(f"[admin] contract uploaded org={org_id} file={file_id} by {admin['email']}")
    fresh = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    return {"ok": True, "contract": _contract_public_meta(fresh, for_admin=True)}


@admin_org_router.get("/organizations/{org_id}/contract")
@limiter.limit(poll_limit("180/minute"))
async def download_admin_org_contract(
    request: Request,
    org_id: str,
    admin: dict = Depends(require_admin),
    inline: bool = Query(False),
):
    exists = await db.organizations.find_one({"org_id": org_id}, {"_id": 0, "org_id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Organisation not found")
    data, filename, content_type, file_id = await _read_contract_file(org_id)
    return _contract_download_response(
        data,
        filename,
        content_type,
        inline=inline and content_type == "application/pdf",
        file_id=file_id,
    )


@admin_org_router.delete("/organizations/{org_id}/contract")
@limiter.limit("10/minute")
async def delete_org_contract(
    request: Request,
    org_id: str,
    admin: dict = Depends(require_admin),
):
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    file_id = org.get("contract_file_id")
    if not file_id:
        raise HTTPException(status_code=404, detail="No contract document on file")
    await db.organizations.update_one(
        {"org_id": org_id},
        {"$unset": {
            "contract_file_id": "",
            "contract_filename": "",
            "contract_content_type": "",
            "contract_uploaded_at": "",
            "contract_uploaded_by": "",
        }, "$set": {"updated_at": _now()}},
    )
    await delete_file(file_id)
    logger.info(f"[admin] contract removed org={org_id} by {admin['email']}")
    return {"ok": True}


@admin_org_router.patch("/organizations/{org_id}")
@limiter.limit("20/minute")
async def update_organization(request: Request, org_id: str, body: OrganizationUpdate,
                              admin: dict = Depends(require_admin)):
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    updates = {"updated_at": _now()}
    if body.name is not None:
        updates["name"] = body.name.strip()[:120] or org["name"]
    if body.monthly_envelope_limit is not None:
        updates["monthly_envelope_limit"] = body.monthly_envelope_limit if body.monthly_envelope_limit > 0 else None
        if body.monthly_envelope_limit > 0:
            updates["enterprise_unlimited"] = False
    if body.enterprise_unlimited is not None:
        updates["enterprise_unlimited"] = body.enterprise_unlimited
        if body.enterprise_unlimited:
            updates["monthly_envelope_limit"] = None
    await db.organizations.update_one({"org_id": org_id}, {"$set": updates})
    fresh = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    return fresh


@admin_org_router.get("/organizations/{org_id}")
@limiter.limit(poll_limit())
async def get_organization(request: Request, org_id: str, admin: dict = Depends(require_admin)):
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    members = await db.users.find(
        {"org_id": org_id},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "plan": 1, "org_role": 1, "active": 1},
    ).to_list(500)
    used = await current_month_org_envelope_count(org_id)
    member_count = len(members)
    limit = org_monthly_limit(org, member_count)
    return {
        **org,
        "members": members,
        "member_count": member_count,
        "per_seat_limit": org_seat_monthly_limit(org),
        "used_this_month": used,
        "monthly_limit": limit,
        "unlimited": limit < 0,
        "contract": _contract_public_meta(org, for_admin=True),
    }


@admin_org_router.delete("/organizations/{org_id}")
@limiter.limit("10/minute")
async def delete_organization(request: Request, org_id: str, admin: dict = Depends(require_admin)):
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0, "contract_file_id": 1})
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    count = await db.users.count_documents({"org_id": org_id})
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete — {count} user(s) still assigned. Remove them first.",
        )
    if org.get("contract_file_id"):
        await delete_file(org["contract_file_id"])
    await db.organizations.delete_one({"org_id": org_id})
    return {"ok": True}