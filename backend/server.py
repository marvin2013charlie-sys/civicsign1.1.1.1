"""CivicSign backend — FastAPI app: auth, envelopes, signer flow, finalization."""
import os
import re
import json
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import (
    FastAPI, APIRouter, Request, HTTPException, Depends,
    UploadFile, File, Form, BackgroundTasks, Query,
)
from fastapi.responses import Response as FastResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limits import limiter

from db import (
    db, upload_file, download_file, delete_file, ping as db_ping,
    upload_document_file, download_document_file,
)
from document_access import (
    assert_can_view_envelope_confidential,
    assert_sender_can_view_document, assert_template_owner_can_view,
    is_privileged_session, maybe_redact_envelope,
)
from schema import ensure_database
import pdf_service
import email_service
from models import (
    EnvelopeUpdate, SendRequest, SignSubmit, DeclineRequest, ContactRequest,
    TemplateCreate, TemplateUse, BulkSend, RemindRequest, SignerAuthVerify,
    TeamCreate, TeamInviteCreate, TemplateShareUpdate, CommentCreate, BrandingUpdate,
    BulkVerifyRequest,
)
from integrations import integrations_router, v1_router, emit_webhook
from auth import auth_router, get_current_user, get_current_user_sse, seed_admin
from security_utils import (
    get_cors_origins, validate_redirect_base, esc, trust_proxy, sniff_image_type, is_dev_mode,
    assert_safe_production, assert_document_encryption_key, security_headers,
)
import hashlib
import secrets as _secrets
from plan_features import (
    plan_features, has_feature, require_feature, owner_has_feature,
    get_bulk_send_max_rows, sms_auth_available,
)
from signature_levels import (
    resolve_send_signature_level,
    resolve_signer_view_level,
    level_audit_label,
    consent_audit_detail,
    signed_audit_detail,
    build_signer_evidence,
)
from organizations import (
    enforce_quota, resolve_usage_quota, release_envelope_quota,
    org_router, admin_org_router,
)
from document_ai import ai_router
from contacts import contacts_router
from powerforms import powerforms_router, public_router
from signer_vault import vault_router
from admin import admin_router
from blog_admin import public_router as blog_public_router, admin_router as blog_admin_router
from careers import public_router as careers_public_router, admin_router as careers_admin_router
from assistant import assistant_router
from billing import billing_router
from pdf_manager import pdf_router

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("civicsign")

app = FastAPI(title="CivicSign API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

RECIPIENT_COLORS = ["#14B8A6", "#38BDF8", "#F59E0B", "#FB7185", "#84CC16", "#A78BFA"]
DOCX_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_SIGNER_FIELD_CHARS = 2_000_000    # ~1.5 MB base64 payload cap per field


def _resolve_redirect_base(request: Request, body_url: str = "") -> str:
    return validate_redirect_base(body_url, fallback=request.headers.get("origin", ""))


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def now_human():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def client_ip(request: Request) -> str:
    if trust_proxy():
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    return request.client.host if request.client else "-"


def audit_event(actor, action, ip="-", detail=None):
    return {"timestamp": now_human(), "actor": actor, "action": action,
            "ip": ip, "detail": detail}


def can_sign(env: dict, recipient: dict) -> bool:
    if env["status"] not in ("sent", "viewed"):
        return False
    if recipient["status"] in ("signed", "declined"):
        return False
    if env.get("signing_order", "sequential") == "parallel":
        return True
    order = recipient.get("order", 1)
    for r in env["recipients"]:
        if r.get("order", 1) < order and r["status"] != "signed":
            return False
    return True


SIGNER_SIGN_ONLY_FIELD_TYPES = frozenset({"signature", "initials"})
IDLE_ENVELOPE_DAYS = 3


def is_sign_only_document(env: dict) -> bool:
    """Word uploads are converted to PDF but signers may only add signatures."""
    return (env.get("document") or {}).get("file_type") == "docx"


def signer_field_editable(field: dict, recipient: dict, env: dict, signable: bool) -> bool:
    if field.get("recipient_id") != recipient.get("recipient_id"):
        return False
    if not signable or recipient.get("status") in ("signed", "declined"):
        return False
    if is_sign_only_document(env) and field.get("type") not in SIGNER_SIGN_ONLY_FIELD_TYPES:
        return False
    return True


def is_sent_envelope(item: dict) -> bool:
    """True when the envelope was sent for signature (not a draft or saved PDF)."""
    return bool(item.get("sent_at"))


def envelope_list_query(
    owner_id: str,
    status: str | None = None,
    q: str | None = None,
    *,
    exclude_manage_pdf: bool = False,
    manage_pdf_only: bool = False,
    sealed_only: bool = False,
) -> dict:
    query: dict = {"owner_id": owner_id}
    if q and q.strip():
        query["title"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    if status and status != "all":
        if status == "awaiting":
            query["status"] = {"$in": ["sent", "viewed"]}
        else:
            query["status"] = status
    if manage_pdf_only:
        query["manage_pdf_tool"] = {"$exists": True, "$nin": [None, ""]}
    elif exclude_manage_pdf:
        query["$or"] = [
            {"manage_pdf_tool": {"$exists": False}},
            {"manage_pdf_tool": None},
            {"manage_pdf_tool": ""},
        ]
    if sealed_only:
        query["status"] = "completed"
        query["doc_hash"] = {"$exists": True, "$nin": [None, ""]}
    return query


async def get_envelope_owned(envelope_id: str, user: dict) -> dict:
    env = await db.envelopes.find_one(
        {"envelope_id": envelope_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    return env


async def copy_document_file(
    file_id: str,
    filename: str,
    src_scope_type: str,
    src_scope_id: str,
    dst_scope_type: str,
    dst_scope_id: str,
) -> str:
    """Re-encrypt document bytes under a new scope (template → envelope, etc.)."""
    data = await download_document_file(file_id, src_scope_type, src_scope_id)
    return await upload_document_file(data, filename, dst_scope_type, dst_scope_id)


async def copy_gridfs(
    file_id: str,
    filename: str,
    src_scope_type: str,
    src_scope_id: str,
    dst_scope_type: str,
    dst_scope_id: str,
) -> str:
    return await copy_document_file(
        file_id, filename, src_scope_type, src_scope_id, dst_scope_type, dst_scope_id,
    )


def _expired(env: dict) -> bool:
    exp = env.get("expires_at")
    return bool(exp and env.get("status") in ("sent", "viewed") and exp < now_iso())


async def maybe_expire(env: dict) -> dict:
    """Lazily mark an envelope expired when accessed past its expiry."""
    if _expired(env):
        env["status"] = "expired"
        env.setdefault("audit_events", []).append(
            audit_event("system", "Envelope expired", "-", "Expiration date passed"))
        await db.envelopes.update_one(
            {"envelope_id": env["envelope_id"]},
            {"$set": {"status": "expired", "audit_events": env["audit_events"],
                      "updated_at": now_iso()}})
    return env


def build_envelope_from_template(tpl: dict, owner: dict, new_file_id: str,
                                 role_to_recipient: dict, envelope_id: str | None = None):
    """Create a draft envelope dict from a template + a {role_id: {name,email}} map."""
    recipients = []
    rid_by_role = {}
    for role in sorted(tpl["roles"], key=lambda r: r.get("order", 1)):
        info = role_to_recipient.get(role["role_id"]) or {}
        rid = f"rcp_{uuid.uuid4().hex[:10]}"
        rid_by_role[role["role_id"]] = rid
        recipients.append({
            "recipient_id": rid,
            "name": (info.get("name") or role["name"]).strip(),
            "email": (info.get("email") or "").lower().strip(),
            "order": role.get("order", 1), "color": role.get("color", "#14B8A6"),
            "status": "pending", "access_token": uuid.uuid4().hex,
            "viewed_at": None, "signed_at": None, "signer_name": None,
        })
    fields = []
    for f in tpl["fields"]:
        if f["role_id"] not in rid_by_role:
            continue
        fields.append({
            "field_id": f"fld_{uuid.uuid4().hex[:10]}",
            "recipient_id": rid_by_role[f["role_id"]], "page": f["page"],
            "type": f["type"], "x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"],
            "required": f.get("required", True), "label": f.get("label"),
            "options": f.get("options"), "value": None,
        })
    return {
        "envelope_id": envelope_id or f"env_{uuid.uuid4().hex[:16]}",
        "owner_id": owner["user_id"], "owner_name": owner.get("name") or owner["email"],
        "title": tpl["name"], "message": "", "status": "draft",
        "signing_order": tpl.get("signing_order", "sequential"),
        "document": {"original_filename": tpl["document"]["original_filename"],
                     "file_type": tpl["document"]["file_type"], "file_id": new_file_id,
                     "page_count": tpl["document"]["page_count"],
                     "pages": tpl["document"]["pages"]},
        "recipients": recipients, "fields": fields,
        "audit_events": [audit_event(owner["email"], "Envelope created", "-",
                                     f"From template: {tpl['name']}")],
        "created_at": now_iso(), "updated_at": now_iso(),
        "sent_at": None, "completed_at": None, "expires_at": None,
        "completed_file_id": None, "doc_hash": None, "template_id": tpl["template_id"],
    }


def _envelope_finalize_fields(env: dict) -> list:
    fields = []
    for f in env.get("fields") or []:
        if f.get("value") in (None, ""):
            continue
        fields.append({
            "page": f.get("page", 0), "type": f.get("type"),
            "rect_pct": {"x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"]},
            "value": f.get("value"),
        })
    return fields


async def _envelope_reference_hash(env: dict) -> str:
    pdf_bytes = await download_document_file(
        env["document"]["file_id"], "envelope", env["envelope_id"],
    )
    return pdf_service.compute_reference_hash(
        pdf_bytes,
        _envelope_finalize_fields(env),
        env.get("signed_page_count"),
    )


async def finalize_envelope_doc(env: dict):
    """Stamp every collected value, append certificate, persist, email parties."""
    pdf_bytes = await download_document_file(
        env["document"]["file_id"], "envelope", env["envelope_id"],
    )
    fields = _envelope_finalize_fields(env)
    events = list(env["audit_events"])
    meta = {
        "envelope_id": env["envelope_id"],
        "title": env["title"],
        "status": "Completed",
        "signature_level": env.get("signature_level") or "basic",
    }
    completed_bytes, doc_hash, signed_page_count = pdf_service.finalize_envelope(
        pdf_bytes, fields, meta, events,
    )
    completed_id = await upload_document_file(
        completed_bytes,
        f"{env['title']}-completed.pdf".replace(" ", "_"),
        "envelope",
        env["envelope_id"],
    )
    env["audit_events"].append(
        audit_event("system", "Envelope completed", "-",
                    f"All parties signed — document hash {doc_hash[:16]}…"))
    result = await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"], "status": "completing"},
        {"$set": {"status": "completed", "completed_at": now_iso(),
                  "completed_file_id": completed_id, "doc_hash": doc_hash,
                  "signed_page_count": signed_page_count,
                  "audit_events": env["audit_events"], "updated_at": now_iso()}})
    if result.modified_count == 0:
        logger.info(f"[finalize] envelope {env['envelope_id']} already finalized — skipping")
        return
    try:
        owner = await db.users.find_one({"user_id": env["owner_id"]}, {"_id": 0})
        recipients_emails = [r["email"] for r in env["recipients"]]
        targets = list({*(([owner["email"]] if owner else []) + recipients_emails)})
        for em in targets:
            email_service.send_completion(em, env["title"], completed_bytes)
    except Exception as e:
        logger.error(f"completion email error: {e}")


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "CivicSign", "status": "ok"}


@api_router.get("/health")
async def health():
    """Liveness + database reachability (for load balancers / uptime checks)."""
    db_ok = await db_ping()
    payload = {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "email_configured": email_service.is_configured(),
        "dev_mode": is_dev_mode(),
    }
    return FastResponse(
        content=json.dumps(payload),
        media_type="application/json",
        status_code=200 if db_ok else 503,
    )


@api_router.post("/contact")
@limiter.limit("10/hour")
async def contact(request: Request, body: ContactRequest):
    """Public contact form submission (stored; email is best-effort skip-mode)."""
    email = body.email.lower().strip()
    org_staff = await db.users.find_one(
        {
            "email": email,
            "org_id": {"$exists": True, "$ne": None},
            "org_role": {"$ne": "owner"},
            "active": {"$ne": False},
        },
        {"_id": 1},
    )
    if org_staff:
        raise HTTPException(
            status_code=403,
            detail=(
                "Organisation members should contact their organisation admin first. "
                "Your admin can escalate to CivicSign on your organisation's behalf."
            ),
        )
    doc = {
        "contact_id": f"msg_{uuid.uuid4().hex[:16]}",
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "subject": (body.subject or "General enquiry").strip(),
        "message": body.message.strip(),
        "ip": client_ip(request),
        "created_at": now_iso(),
        "handled": False,
    }
    await db.contact_messages.insert_one(dict(doc))
    try:
        support = os.environ.get("SENDER_EMAIL") or os.environ.get("ADMIN_EMAIL")
        if support:
            from email_service import _shell, _send
            html = _shell(
                "New contact message",
                f"<p><b>{esc(doc['name'])}</b> ({esc(doc['email'])}) wrote:</p>"
                f"<p><b>{esc(doc['subject'])}</b></p><p>{esc(doc['message'])}</p>",
            )
            _send(support, f"[CivicSign] Contact: {doc['subject']}", html)
    except Exception as e:
        logger.warning(f"contact email skipped: {e}")
    return {"ok": True, "message": "Thanks! We'll get back to you within 1 business day."}


# --------------------------------------------------------------------------
# Envelopes (authenticated sender)
# --------------------------------------------------------------------------

@api_router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    """Current user's monthly envelope quota usage — powers the dashboard meter."""
    usage = await resolve_usage_quota(user)
    return {**usage, "features": plan_features(user)}


@api_router.post("/envelopes")
async def create_envelope(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(None),
    user: dict = Depends(get_current_user),
):
    envelope_id = f"env_{uuid.uuid4().hex[:16]}"
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large — maximum size is 25 MB")
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    fname = file.filename or "document"
    is_docx = fname.lower().endswith((".docx", ".doc")) or (file.content_type in DOCX_TYPES)
    is_pdf = fname.lower().endswith(".pdf") or file.content_type == "application/pdf"
    if not (is_docx or is_pdf):
        raise HTTPException(status_code=400, detail="Only PDF and Word (.docx) files are supported")
    try:
        if is_docx:
            pdf_bytes = pdf_service.convert_docx_to_pdf_bytes(raw)
        else:
            pdf_bytes = raw
        pdf_bytes = pdf_service.normalize_pdf_viewbox(pdf_bytes)
        page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    except RuntimeError as e:
        msg = str(e)
        if "DOCX conversion unavailable" in msg or "conversion failed" in msg.lower():
            raise HTTPException(status_code=503, detail=msg)
        logger.error(f"upload processing error: {e}")
        raise HTTPException(status_code=400, detail="Could not process document")
    except Exception as e:
        logger.error(f"upload processing error: {e}")
        raise HTTPException(status_code=400, detail="Could not process document")

    file_id = await upload_document_file(
        pdf_bytes, fname.rsplit(".", 1)[0] + ".pdf", "envelope", envelope_id,
    )
    env_title = (title or fname.rsplit(".", 1)[0] or "Untitled Document").strip()
    envelope = {
        "envelope_id": envelope_id,
        "owner_id": user["user_id"],
        "owner_name": user.get("name") or user["email"],
        "title": env_title, "message": "", "status": "draft",
        "signing_order": "sequential",
        "document": {"original_filename": fname,
                     "file_type": "docx" if is_docx else "pdf",
                     "file_id": file_id, "page_count": page_count, "pages": pages},
        "recipients": [], "fields": [],
        "audit_events": [audit_event(user["email"], "Envelope created", client_ip(request),
                                     f"Uploaded {fname}" + (" (converted to PDF)" if is_docx else ""))],
        "created_at": now_iso(), "updated_at": now_iso(),
        "sent_at": None, "completed_at": None, "expires_at": None,
        "completed_file_id": None, "doc_hash": None, "template_id": None,
    }
    await db.envelopes.insert_one(dict(envelope))
    envelope.pop("_id", None)
    return envelope


@api_router.get("/envelopes")
async def list_envelopes(
    user: dict = Depends(get_current_user),
    limit: int = Query(500, ge=1, le=2000),
    skip: int = Query(0, ge=0),
    paginated: bool = Query(False),
    status: str | None = Query(None),
    q: str | None = Query(None),
    exclude_manage_pdf: bool = Query(False),
    manage_pdf_only: bool = Query(False),
    sealed_only: bool = Query(False),
):
    query = envelope_list_query(
        user["user_id"],
        status=status,
        q=q,
        exclude_manage_pdf=exclude_manage_pdf,
        manage_pdf_only=manage_pdf_only,
        sealed_only=sealed_only,
    )
    items = await db.envelopes.find(query, {"_id": 0}).sort(
        "updated_at", -1).skip(skip).limit(limit).to_list(limit)
    if is_privileged_session(user):
        items = [maybe_redact_envelope(user, it) for it in items]
    if paginated:
        total = await db.envelopes.count_documents(query)
        return {"items": items, "total": total, "skip": skip, "limit": limit}
    return items


@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    items = await db.envelopes.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "status": 1, "created_at": 1, "completed_at": 1,
         "updated_at": 1, "envelope_id": 1, "title": 1, "sent_at": 1}).to_list(2000)
    counts = {"draft": 0, "sent": 0, "viewed": 0, "completing": 0,
              "completed": 0, "declined": 0, "voided": 0, "expired": 0}
    sent_items = []
    for it in items:
        s = it.get("status", "draft")
        counts[s] = counts.get(s, 0) + 1
        if is_sent_envelope(it):
            sent_items.append(it)
    total = len(sent_items)
    pending = counts["sent"] + counts["viewed"]
    completion_rate = round((counts["completed"] / total) * 100) if total else 0
    series = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        c = sum(
            1 for it in sent_items
            if (it.get("sent_at") or "")[:10] == d.isoformat()
        )
        series.append({"date": d.strftime("%b %d"), "count": c})
    idle_cutoff = (datetime.now(timezone.utc) - timedelta(days=IDLE_ENVELOPE_DAYS)).isoformat()
    idle = []
    for it in sent_items:
        if it.get("status") not in ("sent", "viewed"):
            continue
        if (it.get("updated_at") or "") >= idle_cutoff:
            continue
        title = "Confidential document" if is_privileged_session(user) else (it.get("title") or "Untitled")
        idle.append({"envelope_id": it["envelope_id"], "title": title})
    return {"total": total, "counts": counts, "pending": pending,
            "completion_rate": completion_rate, "series": series,
            "idle": idle, "idle_count": len(idle),
            "draft_count": counts.get("draft", 0)}


@api_router.get("/envelopes/{envelope_id}")
async def get_envelope(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    env = await maybe_expire(env)
    return maybe_redact_envelope(user, env)


@api_router.put("/envelopes/{envelope_id}")
async def update_envelope(envelope_id: str, body: EnvelopeUpdate,
                          user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if env["status"] not in ("draft",):
        raise HTTPException(status_code=400, detail="Only draft envelopes can be edited")
    update = {"updated_at": now_iso()}
    if body.title is not None:
        update["title"] = body.title.strip() or env["title"]
    if body.message is not None:
        update["message"] = body.message
    if body.signing_order in ("sequential", "parallel"):
        update["signing_order"] = body.signing_order
    if body.recipients is not None:
        feats = plan_features(user)
        max_recipients = feats.get("max_recipients")
        if max_recipients is not None and len(body.recipients) > max_recipients:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Your {feats['plan'].capitalize()} plan allows up to {max_recipients} recipients. "
                    "Upgrade to Pro for unlimited recipients."
                ),
            )
        recs = []
        existing_by_id = {r["recipient_id"]: r for r in env["recipients"]}
        for i, r in enumerate(body.recipients):
            rid = r.recipient_id or f"rcp_{uuid.uuid4().hex[:10]}"
            prev = existing_by_id.get(rid, {})
            auth_method = (r.auth_method or "").lower().strip() or None
            if auth_method and auth_method not in ("sms", "kba"):
                raise HTTPException(status_code=400, detail="auth_method must be sms or kba")
            if auth_method:
                require_feature(user, "recipient_auth")
            if auth_method == "sms" and not sms_auth_available():
                raise HTTPException(
                    status_code=400,
                    detail="SMS verification is not available yet — use postcode (KBA) verification instead",
                )
            if auth_method == "sms" and not (r.auth_phone or "").strip():
                raise HTTPException(status_code=400, detail="SMS authentication requires auth_phone")
            if auth_method == "kba" and not (r.auth_kba_postcode or "").strip():
                raise HTTPException(status_code=400, detail="KBA authentication requires auth_kba_postcode")
            rec = {
                "recipient_id": rid, "name": r.name.strip(),
                "email": r.email.lower().strip(), "order": r.order or (i + 1),
                "color": r.color or RECIPIENT_COLORS[i % len(RECIPIENT_COLORS)],
                "status": "pending",
                "access_token": prev.get("access_token") or uuid.uuid4().hex,
                "viewed_at": None, "signed_at": None, "signer_name": None,
                "auth_method": auth_method,
                "auth_phone": (r.auth_phone or "").strip() if auth_method == "sms" else None,
                "auth_kba_postcode": (r.auth_kba_postcode or "").strip().upper()
                if auth_method == "kba" else None,
                "auth_verified": prev.get("auth_verified", False) if auth_method else True,
            }
            if not auth_method:
                rec.pop("auth_method", None)
                rec.pop("auth_phone", None)
                rec.pop("auth_kba_postcode", None)
                rec["auth_verified"] = True
            recs.append(rec)
        update["recipients"] = recs
    if body.fields is not None:
        valid_rids = {r["recipient_id"] for r in update.get("recipients", env["recipients"])}
        flds = []
        for f in body.fields:
            if f.recipient_id not in valid_rids:
                continue
            flds.append({
                "field_id": f.field_id or f"fld_{uuid.uuid4().hex[:10]}",
                "recipient_id": f.recipient_id, "page": f.page, "type": f.type,
                "x": f.x, "y": f.y, "w": f.w, "h": f.h,
                "required": f.required, "label": f.label, "options": f.options, "value": f.value,
            })
        update["fields"] = flds
    await db.envelopes.update_one({"envelope_id": envelope_id}, {"$set": update})
    return await get_envelope_owned(envelope_id, user)


@api_router.post("/envelopes/{envelope_id}/send")
async def send_envelope(envelope_id: str, body: SendRequest, request: Request,
                        user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if env["status"] != "draft":
        raise HTTPException(status_code=400, detail="Envelope already sent")
    if not env["recipients"]:
        raise HTTPException(status_code=400, detail="Add at least one recipient before sending")
    if not env["fields"]:
        raise HTTPException(status_code=400, detail="Add at least one field before sending")
    rids_with_fields = {f["recipient_id"] for f in env["fields"]}
    for r in env["recipients"]:
        if r["recipient_id"] not in rids_with_fields:
            raise HTTPException(status_code=400,
                                detail=f"Recipient {r['name']} has no fields assigned")
    credits = await enforce_quota(user, count=1)
    msg = body.message if body.message is not None else env.get("message")
    expires_at = None
    if body.expires_in_days and body.expires_in_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)).isoformat()
    env["status"] = "sent"
    env["sent_at"] = now_iso()
    env["message"] = msg
    env["expires_at"] = expires_at
    sig_level = resolve_send_signature_level(user, body.signature_level)
    env["signature_level"] = sig_level
    auto_remind = None
    if body.auto_remind_enabled:
        from plan_features import has_feature as hf
        interval = body.auto_remind_days or 3
        max_n = body.auto_remind_max or 3
        if hf(user, "auto_reminders"):
            next_at = (datetime.now(timezone.utc) + timedelta(days=interval)).isoformat()
            auto_remind = {
                "enabled": True,
                "interval_days": interval,
                "max_reminders": max_n,
                "sent_count": 0,
                "last_remind_at": None,
                "next_remind_at": next_at,
            }
    env["auto_remind"] = auto_remind
    audit_detail = (
        f"{len(env['recipients'])} recipient(s), {env['signing_order']} order"
        + (f", expires in {body.expires_in_days} days" if expires_at else "")
        + f", {level_audit_label(sig_level)}"
    )
    env["audit_events"].append(
        audit_event(user["email"], "Sent for signature", client_ip(request), audit_detail))
    try:
        await db.envelopes.update_one(
            {"envelope_id": envelope_id},
            {"$set": {"status": "sent", "sent_at": env["sent_at"], "message": msg,
                      "expires_at": expires_at, "signature_level": sig_level,
                      "auto_remind": auto_remind,
                      "recipients": env["recipients"], "audit_events": env["audit_events"],
                      "updated_at": now_iso()}})
    except Exception:
        await release_envelope_quota(user, count=1, credits_consumed=credits)
        raise
    base = _resolve_redirect_base(request, body.base_url or "")
    links = []
    for r in env["recipients"]:
        link = f"{base}/sign/{r['access_token']}"
        links.append({"recipient_id": r["recipient_id"], "name": r["name"],
                      "email": r["email"], "token": r["access_token"], "sign_url": link})
        if can_sign(env, r) and link:
            email_service.send_signing_invite(
                r["email"], r["name"], env["owner_name"], env["title"], link, msg)
    emit_webhook(env["owner_id"], "envelope.sent", {
        "envelope_id": envelope_id, "title": env["title"], "status": "sent",
        "recipient_count": len(env["recipients"]),
    })
    return {
        "status": "sent",
        "links": links,
        "email_configured": email_service.is_configured(),
        "dev_mode": is_dev_mode(),
    }


@api_router.post("/envelopes/{envelope_id}/remind")
async def remind_envelope(envelope_id: str, body: RemindRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    env = await maybe_expire(env)
    if env["status"] not in ("sent", "viewed"):
        raise HTTPException(status_code=400, detail="Only active envelopes can be reminded")
    base = _resolve_redirect_base(request, body.base_url or "")
    reminded = []
    for r in env["recipients"]:
        if can_sign(env, r):
            link = f"{base}/sign/{r['access_token']}"
            if link:
                email_service.send_signing_invite(
                    r["email"], r["name"], env["owner_name"], env["title"], link,
                    env.get("message"))
            reminded.append(r["email"])
    if not reminded:
        raise HTTPException(status_code=400, detail="No recipients are currently awaiting signature")
    env["audit_events"].append(
        audit_event(user["email"], "Reminder sent", client_ip(request),
                    f"Reminded {len(reminded)} recipient(s)"))
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$set": {"audit_events": env["audit_events"], "updated_at": now_iso()}})
    return {
        "reminded": len(reminded),
        "emails": reminded,
        "email_configured": email_service.is_configured(),
        "dev_mode": is_dev_mode(),
    }


@api_router.post("/envelopes/{envelope_id}/void")
async def void_envelope(envelope_id: str, request: Request,
                        user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if env["status"] in ("completed", "declined", "voided", "expired"):
        raise HTTPException(status_code=400, detail="Envelope already finalized")
    env["audit_events"].append(audit_event(user["email"], "Envelope voided", client_ip(request)))
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$set": {"status": "voided", "audit_events": env["audit_events"],
                  "updated_at": now_iso()}})
    emit_webhook(env["owner_id"], "envelope.voided", {
        "envelope_id": envelope_id, "title": env["title"], "status": "voided",
    })
    return {"status": "voided"}


@api_router.delete("/envelopes/{envelope_id}")
async def delete_envelope(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    await delete_file(env["document"]["file_id"])
    if env.get("completed_file_id"):
        await delete_file(env["completed_file_id"])
    await db.envelopes.delete_one({"envelope_id": envelope_id})
    return {"ok": True}


@api_router.get("/envelopes/{envelope_id}/file")
async def envelope_file(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    assert_sender_can_view_document(user, env)
    data = await download_document_file(
        env["document"]["file_id"], "envelope", env["envelope_id"],
    )
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline; filename=document.pdf"})


@api_router.get("/envelopes/{envelope_id}/completed")
async def envelope_completed(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    assert_sender_can_view_document(user, env)
    if not env.get("completed_file_id"):
        raise HTTPException(status_code=404, detail="Document not completed yet")
    data = await download_document_file(
        env["completed_file_id"], "envelope", env["envelope_id"],
    )
    safe = (env["title"] or "document").replace(" ", "_")
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{safe}-completed.pdf"'})


async def _migrate_envelope_seal(env: dict) -> dict:
    """Regenerate completed PDF and refresh doc_hash after a stale seal migration."""
    old_file_id = env.get("completed_file_id")
    fields = _envelope_finalize_fields(env)
    events = list(env.get("audit_events") or [])
    meta = {
        "envelope_id": env["envelope_id"],
        "title": env["title"],
        "status": "Completed",
        "signature_level": env.get("signature_level") or "basic",
    }
    src_pdf = await download_document_file(
        env["document"]["file_id"], "envelope", env["envelope_id"],
    )
    completed_bytes, doc_hash, signed_page_count = pdf_service.finalize_envelope(
        src_pdf, fields, meta, events,
    )
    completed_id = await upload_document_file(
        completed_bytes,
        f"{env['title']}-completed.pdf".replace(" ", "_"),
        "envelope",
        env["envelope_id"],
    )
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {
            "doc_hash": doc_hash,
            "signed_page_count": signed_page_count,
            "completed_file_id": completed_id,
            "updated_at": now_iso(),
        }},
    )
    if old_file_id and old_file_id != completed_id:
        await delete_file(old_file_id)
    return {
        "doc_hash": doc_hash,
        "signed_page_count": signed_page_count,
        "completed_file_id": completed_id,
    }


async def _persist_seal_verification(envelope_id: str, result: dict, source: str):
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$set": {
            "seal_verification": {
                "status": "verified" if result.get("match") else "mismatch",
                "checked_at": now_iso(),
                "source": source,
                "computed_hash": result.get("computed_hash"),
            },
            "updated_at": now_iso(),
        }},
    )


async def _verify_envelope_pdf(
    env: dict,
    pdf_bytes: bytes,
    source: str,
    migrate_stale: bool = True,
) -> dict:
    reference_hash = await _envelope_reference_hash(env)
    result = pdf_service.verify_completed_pdf_seal(
        pdf_bytes,
        env["doc_hash"],
        signed_page_count=env.get("signed_page_count"),
        reference_hash=reference_hash,
    )
    result["source"] = source
    result["envelope_id"] = env["envelope_id"]
    result["title"] = env.get("title")

    if result.get("seal_migrated") and source == "stored" and migrate_stale:
        migrated = await _migrate_envelope_seal(env)
        result["expected_hash"] = migrated["doc_hash"]
        result["doc_hash_updated"] = True

    await _persist_seal_verification(env["envelope_id"], result, source)
    return result


def _envelope_verify_summary(env: dict) -> dict:
    return {
        "envelope_id": env["envelope_id"],
        "title": env.get("title"),
        "completed_at": env.get("completed_at"),
        "doc_hash": env.get("doc_hash"),
        "seal_verification": env.get("seal_verification"),
    }


@api_router.post("/envelopes/{envelope_id}/verify-seal")
async def verify_envelope_seal(
    envelope_id: str,
    file: UploadFile | None = File(None),
    user: dict = Depends(get_current_user),
):
    """Verify the SHA-256 seal on a completed PDF (stored copy or user upload)."""
    require_feature(user, "seal_verification")
    env = await get_envelope_owned(envelope_id, user)
    assert_sender_can_view_document(user, env)
    if env.get("status") != "completed" or not env.get("doc_hash"):
        raise HTTPException(status_code=400, detail="Envelope is not completed or has no seal")
    if file and file.filename:
        name = (file.filename or "").lower()
        ctype = (file.content_type or "").lower()
        if not name.endswith(".pdf") and "pdf" not in ctype:
            raise HTTPException(status_code=400, detail="Please upload a PDF file")
        pdf_bytes = pdf_service.normalize_uploaded_pdf_bytes(await file.read())
        source = "uploaded"
    else:
        if not env.get("completed_file_id"):
            raise HTTPException(status_code=404, detail="No completed PDF on file")
        pdf_bytes = await download_document_file(
            env["completed_file_id"], "envelope", env["envelope_id"],
        )
        source = "stored"
    if len(pdf_bytes) < 100:
        raise HTTPException(status_code=400, detail="PDF file is empty or too small")
    return await _verify_envelope_pdf(env, pdf_bytes, source)


@api_router.post("/envelopes/verify-seals/bulk")
async def verify_envelopes_bulk(
    body: BulkVerifyRequest,
    user: dict = Depends(get_current_user),
):
    """Verify stored copies for many completed envelopes (batched for large libraries)."""
    require_feature(user, "seal_verification")
    assert_can_view_envelope_confidential(user)
    query = {
        "owner_id": user["user_id"],
        "status": "completed",
        "doc_hash": {"$exists": True, "$ne": None},
        "completed_file_id": {"$exists": True, "$ne": None},
    }
    if body.envelope_ids:
        query["envelope_id"] = {"$in": body.envelope_ids}
    total = await db.envelopes.count_documents(query)
    envs = await db.envelopes.find(query, {"_id": 0}).sort(
        "completed_at", -1,
    ).skip(body.skip).limit(body.limit).to_list(body.limit)

    results = []
    passed = 0
    failed = 0
    for env in envs:
        item = {
            "envelope_id": env["envelope_id"],
            "title": env.get("title"),
            "match": False,
            "message": "",
            "seal_migrated": False,
            "doc_hash_updated": False,
        }
        try:
            pdf_bytes = await download_document_file(
                env["completed_file_id"], "envelope", env["envelope_id"],
            )
            verified = await _verify_envelope_pdf(
                env, pdf_bytes, "stored", migrate_stale=body.migrate_stale,
            )
            item.update({
                "match": verified.get("match", False),
                "message": verified.get("message", ""),
                "seal_migrated": verified.get("seal_migrated", False),
                "doc_hash_updated": verified.get("doc_hash_updated", False),
                "computed_hash": verified.get("computed_hash"),
                "expected_hash": verified.get("expected_hash"),
            })
            if item["match"]:
                passed += 1
            else:
                failed += 1
        except Exception as exc:
            item["message"] = str(exc)[:200]
            failed += 1
        results.append(item)

    return {
        "results": results,
        "total": total,
        "skip": body.skip,
        "limit": body.limit,
        "processed": len(results),
        "passed": passed,
        "failed": failed,
        "has_more": body.skip + len(results) < total,
    }


@api_router.post("/envelopes/verify-seal/lookup")
async def lookup_verify_uploaded_pdf(
    file: UploadFile = File(...),
    scan_limit: int = Query(1000, ge=1, le=2000),
    user: dict = Depends(get_current_user),
):
    """Find a completed envelope in the user's account from an uploaded PDF and verify it."""
    require_feature(user, "seal_verification")
    name = (file.filename or "").lower()
    ctype = (file.content_type or "").lower()
    if not name.endswith(".pdf") and "pdf" not in ctype:
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    pdf_bytes = pdf_service.normalize_uploaded_pdf_bytes(await file.read())
    if len(pdf_bytes) < 100:
        raise HTTPException(status_code=400, detail="PDF file is empty or too small")

    not_found_message = (
        "No matching completed document was found in your account. "
        "Upload the CivicSign completed PDF from Download or your completion email "
        "(it must include the Certificate of Completion at the end)."
    )

    # Fast path: auto-detect certificate page (works when PDF text is intact)
    computed = None
    try:
        computed = pdf_service.compute_signed_content_hash(pdf_bytes)
    except ValueError:
        computed = None

    if computed:
        env = await db.envelopes.find_one({
            "owner_id": user["user_id"],
            "status": "completed",
            "doc_hash": computed,
        }, {"_id": 0})
        if env:
            verification = await _verify_envelope_pdf(env, pdf_bytes, "uploaded", migrate_stale=False)
            return {
                "found": True,
                "match_method": "doc_hash",
                "computed_hash": computed,
                "envelope": _envelope_verify_summary(env),
                "verification": verification,
            }

    envs = await db.envelopes.find({
        "owner_id": user["user_id"],
        "status": "completed",
        "doc_hash": {"$exists": True, "$ne": None},
    }, {"_id": 0}).sort("completed_at", -1).limit(scan_limit).to_list(scan_limit)

    # Scan using each envelope's signed_page_count — same logic as the per-row Verify button
    for candidate in envs:
        spc = candidate.get("signed_page_count")
        try:
            cand_computed = pdf_service.compute_signed_content_hash(pdf_bytes, spc)
        except ValueError:
            continue

        doc_hash = (candidate.get("doc_hash") or "").strip().lower()
        if cand_computed == doc_hash:
            verification = await _verify_envelope_pdf(
                candidate, pdf_bytes, "uploaded", migrate_stale=False,
            )
            return {
                "found": True,
                "match_method": "doc_hash",
                "computed_hash": cand_computed,
                "envelope": _envelope_verify_summary(candidate),
                "verification": verification,
            }

        try:
            reference_hash = await _envelope_reference_hash(candidate)
        except Exception:
            continue
        if cand_computed != reference_hash:
            continue
        verification = await _verify_envelope_pdf(
            candidate, pdf_bytes, "uploaded", migrate_stale=False,
        )
        return {
            "found": True,
            "match_method": "reference",
            "computed_hash": cand_computed,
            "envelope": _envelope_verify_summary(candidate),
            "verification": verification,
            "seal_stale": True,
        }

    return {
        "found": False,
        "computed_hash": computed,
        "scanned": len(envs),
        "message": not_found_message,
    }


# --------------------------------------------------------------------------
# Templates (authenticated)
# --------------------------------------------------------------------------
async def get_template_owned(template_id: str, user: dict) -> dict:
    tpl = await db.templates.find_one(
        {"template_id": template_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


async def _template_access_query(user: dict) -> dict:
    team_ids = await _user_teams(user["user_id"])
    clauses = [{"owner_id": user["user_id"]}]
    if team_ids:
        clauses.append({"shared_with_team": True, "team_id": {"$in": team_ids}})
    return {"$or": clauses}


async def get_usable_template(template_id: str, user: dict) -> dict:
    """Return a template the user owns or that is shared with their team."""
    access = await _template_access_query(user)
    tpl = await db.templates.find_one(
        {"template_id": template_id, "$or": access["$or"]},
        {"_id": 0},
    )
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


@api_router.post("/templates/from-envelope/{envelope_id}")
async def create_template(envelope_id: str, body: TemplateCreate,
                          user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if not env["recipients"] or not env["fields"]:
        raise HTTPException(status_code=400,
                            detail="Add recipients and fields before saving as a template")
    tpl_id = f"tpl_{uuid.uuid4().hex[:16]}"
    new_file = await copy_document_file(
        env["document"]["file_id"],
        env["document"]["original_filename"],
        "envelope", env["envelope_id"],
        "template", tpl_id,
    )
    role_map, roles = {}, []
    for r in sorted(env["recipients"], key=lambda x: x.get("order", 1)):
        role_id = f"role_{uuid.uuid4().hex[:10]}"
        role_map[r["recipient_id"]] = role_id
        roles.append({"role_id": role_id, "name": r["name"], "order": r.get("order", 1),
                      "color": r.get("color", "#14B8A6")})
    fields = [{
        "field_id": f"fld_{uuid.uuid4().hex[:10]}", "role_id": role_map[f["recipient_id"]],
        "page": f["page"], "type": f["type"], "x": f["x"], "y": f["y"], "w": f["w"],
        "h": f["h"], "required": f.get("required", True), "label": f.get("label"),
    } for f in env["fields"] if f["recipient_id"] in role_map]
    tpl = {
        "template_id": tpl_id, "owner_id": user["user_id"],
        "name": body.name.strip() or env["title"], "description": (body.description or "").strip(),
        "document": {"original_filename": env["document"]["original_filename"],
                     "file_type": env["document"]["file_type"], "file_id": new_file,
                     "page_count": env["document"]["page_count"],
                     "pages": env["document"]["pages"]},
        "signing_order": env.get("signing_order", "sequential"),
        "roles": roles, "fields": fields, "use_count": 0,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.templates.insert_one(dict(tpl))
    tpl.pop("_id", None)
    return tpl


@api_router.get("/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    return await db.templates.find(
        await _template_access_query(user), {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/templates/samples")
async def list_sample_templates(user: dict = Depends(get_current_user)):
    from sample_templates import list_samples
    return list_samples()


@api_router.post("/templates/samples/{sample_id}/clone")
async def clone_sample_template(sample_id: str, user: dict = Depends(get_current_user)):
    from sample_templates import clone_sample_for_user
    tpl = await clone_sample_for_user(sample_id, user, upload_document_file)
    if not tpl:
        raise HTTPException(status_code=404, detail="Sample not found")
    await db.templates.insert_one(dict(tpl))
    tpl.pop("_id", None)
    return tpl


@api_router.post("/envelopes/from-merge")
async def create_envelope_from_merge(
    files: list[UploadFile] = File(...),
    title: str = Form("Merged document"),
    user: dict = Depends(get_current_user),
):
    """Merge PDFs and create a draft envelope in one step."""
    envelope_id = f"env_{uuid.uuid4().hex[:16]}"
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Upload at least 2 PDF files")
    parts = []
    for f in files:
        raw = await f.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        parts.append(raw)
    merged = pdf_service.merge_pdf_bytes(parts)
    page_count, pages = pdf_service.get_pdf_info(merged)
    file_id = await upload_document_file(merged, "merged.pdf", "envelope", envelope_id)
    envelope = {
        "envelope_id": envelope_id,
        "owner_id": user["user_id"],
        "owner_name": user.get("name") or user["email"],
        "title": (title or "Merged document").strip()[:200],
        "message": "", "status": "draft", "signing_order": "sequential",
        "document": {"original_filename": "merged.pdf", "file_type": "application/pdf",
                     "file_id": file_id, "page_count": page_count, "pages": pages},
        "recipients": [], "fields": [],
        "audit_events": [audit_event(user["email"], "Envelope created", "-", "Merged PDF")],
        "created_at": now_iso(), "updated_at": now_iso(),
        "sent_at": None, "completed_at": None, "expires_at": None,
        "completed_file_id": None, "doc_hash": None,
    }
    await db.envelopes.insert_one(dict(envelope))
    envelope.pop("_id", None)
    return {"envelope_id": envelope["envelope_id"]}


@api_router.post("/pdf/merge")
async def merge_pdfs(
    files: list[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Upload at least 2 PDF files to merge")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per merge")
    parts = []
    for f in files:
        raw = await f.read()
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
        parts.append(raw)
    try:
        merged = pdf_service.merge_pdf_bytes(parts)
    except Exception as e:
        logger.error(f"pdf merge: {e}")
        raise HTTPException(status_code=400, detail="Could not merge PDFs")
    file_id = await upload_document_file(merged, "merged.pdf", "user_temp", user["user_id"])
    page_count, pages = pdf_service.get_pdf_info(merged)
    return {
        "file_id": file_id,
        "temp_scope": {"scope_type": "user_temp", "scope_id": user["user_id"]},
        "page_count": page_count,
        "pages": pages,
        "filename": "merged.pdf",
    }


@api_router.get("/templates/{template_id}")
async def get_template(template_id: str, user: dict = Depends(get_current_user)):
    return await get_usable_template(template_id, user)


@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    tpl = await get_template_owned(template_id, user)
    await delete_file(tpl["document"]["file_id"])
    await db.templates.delete_one({"template_id": template_id})
    return {"ok": True}


@api_router.get("/templates/{template_id}/file")
async def template_file(template_id: str, user: dict = Depends(get_current_user)):
    tpl = await get_usable_template(template_id, user)
    assert_template_owner_can_view(user, tpl)
    data = await download_document_file(
        tpl["document"]["file_id"], "template", tpl["template_id"],
    )
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline; filename=template.pdf"})


@api_router.post("/templates/{template_id}/use")
async def use_template(template_id: str, body: TemplateUse,
                       user: dict = Depends(get_current_user)):
    tpl = await get_usable_template(template_id, user)
    role_to = {a.role_id: {"name": a.name, "email": a.email} for a in body.recipients}
    role_ids = {r["role_id"] for r in tpl["roles"]}
    for rid in role_ids:
        if rid not in role_to or not role_to[rid]["email"]:
            raise HTTPException(status_code=400, detail="Provide a recipient for every role")
    env_id = f"env_{uuid.uuid4().hex[:16]}"
    new_file = await copy_document_file(
        tpl["document"]["file_id"],
        tpl["document"]["original_filename"],
        "template", tpl["template_id"],
        "envelope", env_id,
    )
    env = build_envelope_from_template(tpl, user, new_file, role_to, envelope_id=env_id)
    await db.envelopes.insert_one(dict(env))
    await db.templates.update_one({"template_id": template_id}, {"$inc": {"use_count": 1}})
    env.pop("_id", None)
    return {"envelope_id": env["envelope_id"]}


@api_router.post("/templates/{template_id}/bulk-send")
async def bulk_send_template(template_id: str, body: BulkSend, request: Request,
                             user: dict = Depends(get_current_user)):
    require_feature(user, "bulk_send")
    tpl = await get_usable_template(template_id, user)
    if len(tpl["roles"]) != 1:
        raise HTTPException(status_code=400,
                            detail="Bulk send is available for single-signer templates only")
    if not body.rows:
        raise HTTPException(status_code=400, detail="Add at least one recipient row")
    max_rows = get_bulk_send_max_rows()
    if len(body.rows) > max_rows:
        raise HTTPException(
            status_code=400,
            detail=f"Bulk send is limited to {max_rows} recipients per batch. "
                   "Split large jobs into multiple batches or contact us for enterprise throughput.",
        )
    batch_size = len(body.rows)
    credits = await enforce_quota(user, count=batch_size)
    role_id = tpl["roles"][0]["role_id"]
    base = _resolve_redirect_base(request, body.base_url or "")
    created = []
    try:
        for row in body.rows:
            env_id = f"env_{uuid.uuid4().hex[:16]}"
            new_file = await copy_document_file(
                tpl["document"]["file_id"],
                tpl["document"]["original_filename"],
                "template", tpl["template_id"],
                "envelope", env_id,
            )
            env = build_envelope_from_template(
                tpl, user, new_file, {role_id: {"name": row.name, "email": row.email}},
                envelope_id=env_id,
            )
            env["status"] = "sent"
            env["sent_at"] = now_iso()
            env["message"] = body.message or ""
            env["signature_level"] = resolve_send_signature_level(user, body.signature_level)
            rcp = env["recipients"][0]
            env["audit_events"].append(
                audit_event(user["email"], "Sent for signature", client_ip(request), "Bulk send"))
            await db.envelopes.insert_one(dict(env))
            link = f"{base}/sign/{rcp['access_token']}"
            email_service.send_signing_invite(
                rcp["email"], rcp["name"], env["owner_name"], env["title"], link, body.message)
            created.append({"envelope_id": env["envelope_id"], "name": rcp["name"],
                            "email": rcp["email"], "sign_url": link})
        await db.templates.update_one({"template_id": template_id},
                                      {"$inc": {"use_count": len(created)}})
        return {"created": len(created), "envelopes": created}
    except Exception:
        remaining = batch_size - len(created)
        if remaining > 0:
            await release_envelope_quota(
                user,
                count=remaining,
                credits_consumed=credits if not created else 0,
            )
        raise


# --------------------------------------------------------------------------
# Signer flow (public, token-based — no account required)
# --------------------------------------------------------------------------
async def _find_by_token(token: str):
    env = await db.envelopes.find_one({"recipients.access_token": token}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Invalid or expired signing link")
    recipient = next((r for r in env["recipients"] if r["access_token"] == token), None)
    if not recipient:
        raise HTTPException(status_code=404, detail="Invalid signing link")
    return env, recipient


@api_router.get("/sign/{token}")
@limiter.limit("120/hour")
async def signer_view(request: Request, token: str):
    env, recipient = await _find_by_token(token)
    env = await maybe_expire(env)
    signable = can_sign(env, recipient)
    if recipient["status"] == "pending" and env["status"] in ("sent", "viewed") and signable:
        for r in env["recipients"]:
            if r["access_token"] == token:
                r["status"] = "viewed"
                r["viewed_at"] = now_iso()
        new_status = "viewed" if env["status"] == "sent" else env["status"]
        env["status"] = new_status
        env["audit_events"].append(
            audit_event(recipient["email"], "Viewed document", client_ip(request),
                        f"User-Agent: {request.headers.get('user-agent', '')[:80]}"))
        await db.envelopes.update_one(
            {"envelope_id": env["envelope_id"]},
            {"$set": {"status": new_status, "recipients": env["recipients"],
                      "audit_events": env["audit_events"], "updated_at": now_iso()}})
        recipient["status"] = "viewed"
        if new_status == "viewed":
            emit_webhook(env["owner_id"], "envelope.viewed", {
                "envelope_id": env["envelope_id"], "title": env["title"],
                "viewer_email": recipient["email"], "status": "viewed",
            })

    # Field-level auto-fill: pre-populate identity / date fields from the recipient
    # profile so the signer sees them filled in (still editable). Already-signed
    # fields retain their persisted value.
    today_iso = datetime.now(timezone.utc).strftime("%b %d, %Y")
    autofill_map = {
        "fullname": recipient.get("name"),
        "email":    recipient.get("email"),
        "company":  recipient.get("company") or "",
        "jobtitle": recipient.get("job_title") or recipient.get("title") or "",
        "signdate": today_iso,
    }
    sign_only = is_sign_only_document(env)
    fields = []
    for f in env["fields"]:
        editable = signer_field_editable(f, recipient, env, signable)
        rcolor = next((r["color"] for r in env["recipients"]
                       if r["recipient_id"] == f["recipient_id"]), "#14B8A6")
        merged = {**f, "editable": editable, "recipient_color": rcolor}
        if (merged.get("value") in (None, "")
                and editable
                and f.get("type") in autofill_map):
            merged["value"] = autofill_map.get(f["type"]) or ""
        fields.append(merged)

    # Pull the owner's branding so the signing page can render their logo/colours (Pro+).
    owner = await db.users.find_one(
        {"user_id": env["owner_id"]},
        {"_id": 0, "user_id": 1, "branding": 1, "plan": 1,
         "plan_signature": 1, "plan_updated_at": 1, "plan_upgraded_via_payment": 1},
    )
    sender_branding = None
    if owner and has_feature(owner, "custom_branding"):
        sender_branding = owner.get("branding")

    sig_level = resolve_signer_view_level(env, owner)

    return {
        "envelope_id": env["envelope_id"], "title": env["title"],
        "message": env.get("message"), "sender_name": env.get("owner_name"),
        "signature_level": sig_level,
        "sender_branding": sender_branding,
        "status": env["status"], "signing_order": env["signing_order"],
        "document": {"page_count": env["document"]["page_count"],
                     "pages": env["document"]["pages"],
                     "file_type": env["document"].get("file_type", "pdf")},
        "sign_only": sign_only,
        "recipient": {"recipient_id": recipient["recipient_id"], "name": recipient["name"],
                      "email": recipient["email"], "color": recipient["color"],
                      "status": recipient["status"], "order": recipient["order"]},
        "fields": fields,
        "signable": signable,
        "already_signed": recipient["status"] == "signed",
        "completed": env["status"] == "completed",
        "auth_required": bool(recipient.get("auth_method")),
        "auth_method": recipient.get("auth_method"),
        "auth_verified": recipient.get("auth_verified", not recipient.get("auth_method")),
        "auth_phone_hint": (
            f"***{recipient['auth_phone'][-4:]}" if recipient.get("auth_phone")
            and len(recipient["auth_phone"]) >= 4 else None
        ),
    }


def _otp_hash(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


SIGNER_AUTH_MAX_ATTEMPTS = 5


@api_router.post("/sign/{token}/auth/send-code")
@limiter.limit("10/hour")
async def signer_send_auth_code(request: Request, token: str):
    """Send SMS verification code (Business plan recipient authentication)."""
    env, recipient = await _find_by_token(token)
    if recipient.get("auth_method") != "sms":
        raise HTTPException(status_code=400, detail="SMS verification is not required for this link")
    if not sms_auth_available():
        raise HTTPException(
            status_code=503,
            detail="SMS verification is temporarily unavailable — ask the sender to resend with postcode verification",
        )
    phone = recipient.get("auth_phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number configured for this signer")
    code = "123456" if is_dev_mode() else f"{_secrets.randbelow(900000) + 100000:06d}"
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    for r in env["recipients"]:
        if r["access_token"] == token:
            r["auth_otp_hash"] = _otp_hash(code)
            r["auth_otp_expires"] = expires
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"recipients": env["recipients"], "updated_at": now_iso()}},
    )
    if is_dev_mode():
        logger.info(f"[signer-auth] DEV SMS code for {phone}: {code}")
    masked = f"{'*' * max(0, len(phone) - 4)}{phone[-4:]}"
    return {"ok": True, "message": f"Verification code sent to {masked}"}


@api_router.post("/sign/{token}/auth/verify")
@limiter.limit("30/hour")
async def signer_verify_auth(request: Request, token: str, body: SignerAuthVerify):
    """Verify SMS code or KBA postcode before signing."""
    env, recipient = await _find_by_token(token)
    method = recipient.get("auth_method")
    if not method:
        return {"verified": True}

    failed = int(recipient.get("auth_failed_attempts") or 0)
    if failed >= SIGNER_AUTH_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Contact the sender for a new signing link.",
        )

    if method == "sms":
        if not body.code:
            raise HTTPException(status_code=400, detail="Enter the verification code")
        if recipient.get("auth_otp_expires") and recipient["auth_otp_expires"] < now_iso():
            raise HTTPException(status_code=400, detail="Code expired — request a new one")
        if _otp_hash(body.code) != recipient.get("auth_otp_hash"):
            await _bump_signer_auth_failure(env, token)
            raise HTTPException(status_code=400, detail="Incorrect verification code")
    elif method == "kba":
        if not body.postcode:
            raise HTTPException(status_code=400, detail="Enter the postcode on file")
        expected = (recipient.get("auth_kba_postcode") or "").upper().replace(" ", "")
        given = (body.postcode or "").upper().replace(" ", "")
        if given != expected:
            await _bump_signer_auth_failure(env, token)
            raise HTTPException(status_code=400, detail="Postcode does not match our records")
    else:
        raise HTTPException(status_code=400, detail="Unknown authentication method")

    for r in env["recipients"]:
        if r["access_token"] == token:
            r["auth_verified"] = True
            r["auth_failed_attempts"] = 0
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"recipients": env["recipients"], "updated_at": now_iso()}},
    )
    return {"verified": True}


async def _bump_signer_auth_failure(env: dict, token: str) -> None:
    for r in env["recipients"]:
        if r["access_token"] == token:
            r["auth_failed_attempts"] = int(r.get("auth_failed_attempts") or 0) + 1
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"recipients": env["recipients"], "updated_at": now_iso()}},
    )


def _assert_signer_file_access(env: dict, recipient: dict) -> None:
    """Gate PDF download to the same rules as signing (auth + turn order)."""
    if env["status"] == "completed":
        raise HTTPException(
            status_code=400,
            detail="Document is completed — use the completed download link",
        )
    if env["status"] not in ("sent", "viewed"):
        raise HTTPException(status_code=400, detail="This document is not available for signing")
    if recipient["status"] == "declined":
        raise HTTPException(status_code=400, detail="You declined this document")
    if recipient["status"] == "signed":
        return
    if not can_sign(env, recipient):
        raise HTTPException(
            status_code=403,
            detail="This document is not currently awaiting your signature",
        )
    if recipient.get("auth_method") and not recipient.get("auth_verified"):
        raise HTTPException(
            status_code=403,
            detail="Complete recipient verification before viewing the document",
        )


@api_router.get("/sign/{token}/file")
@limiter.limit("60/hour")
async def signer_file(request: Request, token: str):
    env, recipient = await _find_by_token(token)
    env = await maybe_expire(env)
    _assert_signer_file_access(env, recipient)
    data = await download_document_file(
        env["document"]["file_id"], "envelope", env["envelope_id"],
    )
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline; filename=document.pdf"})


@api_router.get("/sign/{token}/completed")
@limiter.limit("60/hour")
async def signer_completed(request: Request, token: str):
    env, _ = await _find_by_token(token)
    if not env.get("completed_file_id"):
        raise HTTPException(status_code=404, detail="Document not completed yet")
    data = await download_document_file(
        env["completed_file_id"], "envelope", env["envelope_id"],
    )
    safe = (env["title"] or "document").replace(" ", "_")
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{safe}-completed.pdf"'})


@api_router.post("/sign/{token}/submit")
@limiter.limit("30/hour")
async def signer_submit(token: str, body: SignSubmit, request: Request,
                        background: BackgroundTasks):
    env, recipient = await _find_by_token(token)
    env = await maybe_expire(env)
    if not can_sign(env, recipient):
        raise HTTPException(status_code=400,
                            detail="This document is not currently awaiting your signature")
    if not body.consent:
        raise HTTPException(status_code=400, detail="You must consent to sign electronically")
    if recipient.get("auth_method") and not recipient.get("auth_verified"):
        raise HTTPException(status_code=400,
                            detail="Complete recipient verification before signing")

    for v in body.values:
        if v.value is not None and len(str(v.value)) > MAX_SIGNER_FIELD_CHARS:
            raise HTTPException(status_code=400, detail="A field value is too large")

    sign_only = is_sign_only_document(env)
    values = {v.field_id: v.value for v in body.values}
    my_fields = [f for f in env["fields"] if f["recipient_id"] == recipient["recipient_id"]]
    for f in my_fields:
        if f["field_id"] not in values:
            continue
        if sign_only and f.get("type") not in SIGNER_SIGN_ONLY_FIELD_TYPES:
            continue
        f["value"] = values[f["field_id"]]
    required_for_signer = (
        [f for f in my_fields if f.get("type") in SIGNER_SIGN_ONLY_FIELD_TYPES]
        if sign_only else my_fields
    )
    missing = [
        f for f in required_for_signer
        if f.get("required") and f.get("value") in (None, "", False)
    ]
    if missing:
        raise HTTPException(status_code=400,
                            detail=f"{len(missing)} required field(s) are not completed")

    ip = client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    owner = await db.users.find_one({"user_id": env["owner_id"]}, {"_id": 0})
    sig_level = resolve_signer_view_level(env, owner)
    signed_at = now_iso()
    signer_evidence = build_signer_evidence(
        sig_level,
        ip=ip,
        user_agent=user_agent,
        signed_at=signed_at,
        signer_email=recipient["email"],
        signer_name=body.signer_name or recipient["name"],
        auth_method=recipient.get("auth_method"),
        auth_verified=bool(recipient.get("auth_verified")),
    )
    for r in env["recipients"]:
        if r["access_token"] == token:
            r["status"] = "signed"
            r["signed_at"] = signed_at
            r["signer_name"] = body.signer_name or r["name"]
            if signer_evidence:
                r["signature_evidence"] = signer_evidence
                # Legacy field name kept for backward compatibility
                if sig_level == "ses":
                    r["ses_evidence"] = signer_evidence
    env["signature_level"] = sig_level
    env["audit_events"].append(audit_event(
        recipient["email"], "Consent to e-sign accepted", ip,
        consent_audit_detail(sig_level)))
    env["audit_events"].append(
        audit_event(recipient["email"], "Signed document", ip,
                    signed_audit_detail(sig_level, len(my_fields))))

    all_signed = all(r["status"] == "signed" for r in env["recipients"])
    next_recipient = None
    if not all_signed and env["signing_order"] == "sequential":
        for r in sorted(env["recipients"], key=lambda x: x["order"]):
            if r["status"] not in ("signed", "declined") and can_sign(
                    {**env, "status": "sent"}, r):
                next_recipient = r
                break

    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"recipients": env["recipients"], "fields": env["fields"],
                  "audit_events": env["audit_events"], "updated_at": now_iso()}})
    emit_webhook(env["owner_id"], "envelope.signed", {
        "envelope_id": env["envelope_id"], "title": env["title"],
        "signer_email": recipient["email"], "all_signed": all_signed,
    })

    if all_signed:
        claimed = await db.envelopes.update_one(
            {"envelope_id": env["envelope_id"], "status": {"$in": ["sent", "viewed"]}},
            {"$set": {"status": "completing", "updated_at": now_iso()}},
        )
        if claimed.modified_count == 0:
            fresh = await db.envelopes.find_one(
                {"envelope_id": env["envelope_id"]}, {"_id": 0, "status": 1})
            if fresh and fresh.get("status") == "completed":
                return {"status": "completed", "message": "All parties have signed."}
            return {"status": "completing", "message": "Finalizing signed document…"}
        env_full = await db.envelopes.find_one({"envelope_id": env["envelope_id"]}, {"_id": 0})
        background.add_task(finalize_envelope_doc, env_full)
        emit_webhook(env["owner_id"], "envelope.completed", {
            "envelope_id": env["envelope_id"], "title": env["title"],
        })
        return {"status": "completed", "message": "All parties have signed."}

    if next_recipient:
        base = request.headers.get("origin", "").rstrip("/")
        link = f"{base}/sign/{next_recipient['access_token']}" if base else None
        if link:
            email_service.send_signing_invite(
                next_recipient["email"], next_recipient["name"],
                env["owner_name"], env["title"], link, env.get("message"))
    return {"status": "signed", "message": "Your signature has been recorded."}


@api_router.post("/sign/{token}/decline")
@limiter.limit("30/hour")
async def signer_decline(request: Request, token: str, body: DeclineRequest):
    env, recipient = await _find_by_token(token)
    env = await maybe_expire(env)
    if recipient["status"] in ("signed", "declined"):
        raise HTTPException(status_code=400, detail="You have already responded")
    for r in env["recipients"]:
        if r["access_token"] == token:
            r["status"] = "declined"
    env["audit_events"].append(
        audit_event(recipient["email"], "Declined to sign", client_ip(request), body.reason))
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"status": "declined", "recipients": env["recipients"],
                  "audit_events": env["audit_events"], "updated_at": now_iso()}})
    try:
        owner = await db.users.find_one({"user_id": env["owner_id"]}, {"_id": 0})
        if owner:
            email_service.send_declined(owner["email"], env["title"],
                                        recipient["name"], body.reason)
    except Exception:
        pass
    emit_webhook(env["owner_id"], "envelope.declined", {
        "envelope_id": env["envelope_id"], "title": env["title"],
        "signer_email": recipient["email"], "reason": body.reason,
    })
    return {"status": "declined"}


# ===========================================================================
# CUSTOM BRANDING (Feature 4)
# ===========================================================================
HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _valid_hex(color):
    return isinstance(color, str) and bool(HEX_RE.match(color))


@api_router.get("/me/branding")
async def get_branding(user: dict = Depends(get_current_user)):
    return user.get("branding") or {
        "logo_url": None, "primary_color": None, "accent_color": None, "banner_text": None,
    }


@api_router.patch("/me/branding")
async def update_branding(body: BrandingUpdate, user: dict = Depends(get_current_user)):
    require_feature(user, "custom_branding")
    branding = dict(user.get("branding") or {})
    if body.primary_color is not None:
        if not _valid_hex(body.primary_color):
            raise HTTPException(status_code=400, detail="primary_color must be a hex colour like #14B8A6")
        branding["primary_color"] = body.primary_color
    if body.accent_color is not None:
        if not _valid_hex(body.accent_color):
            raise HTTPException(status_code=400, detail="accent_color must be a hex colour like #14B8A6")
        branding["accent_color"] = body.accent_color
    if body.banner_text is not None:
        branding["banner_text"] = body.banner_text[:140] if body.banner_text else None
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"branding": branding, "updated_at": now_iso()}})
    return branding


@api_router.post("/me/branding/logo")
async def upload_branding_logo(file: UploadFile = File(...),
                               user: dict = Depends(get_current_user)):
    require_feature(user, "custom_branding")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 2 MB")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Logo must be an image")
    detected = sniff_image_type(raw)
    if not detected:
        raise HTTPException(status_code=400, detail="Logo file content is not a supported image")
    ext = (file.filename or "logo.png").rsplit(".", 1)[-1].lower()
    file_id = await upload_file(raw, f"branding_logo.{ext}")
    branding = dict(user.get("branding") or {})
    branding["logo_url"] = f"/api/me/branding/logo/{file_id}"
    branding["logo_file_id"] = file_id
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"branding": branding, "updated_at": now_iso()}})
    return branding


@api_router.get("/me/branding/logo/{file_id}")
async def get_branding_logo(file_id: str, user: dict = Depends(get_current_user)):
    branding = user.get("branding") or {}
    if branding.get("logo_file_id") != file_id:
        raise HTTPException(status_code=404, detail="Logo not found")
    try:
        data = await download_file(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Logo not found")
    return FastResponse(content=data, media_type="image/png",
                        headers={"Cache-Control": "private, max-age=3600"})


# ===========================================================================
# TEAMS & SHARED TEMPLATES (Feature 2)
# ===========================================================================
async def _user_teams(user_id: str) -> list:
    """All team_ids a user belongs to (as owner or member)."""
    teams = await db.teams.find(
        {"$or": [{"owner_id": user_id}, {"members.user_id": user_id}]},
        {"team_id": 1, "_id": 0}).to_list(100)
    return [t["team_id"] for t in teams]


@api_router.post("/teams")
async def create_team(body: TeamCreate, user: dict = Depends(get_current_user)):
    require_feature(user, "team_templates")
    team = {
        "team_id": f"team_{uuid.uuid4().hex[:14]}",
        "name": body.name.strip(),
        "owner_id": user["user_id"],
        "members": [{
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name") or user["email"],
            "role": "owner",
            "added_at": now_iso(),
        }],
        "created_at": now_iso(),
    }
    await db.teams.insert_one(dict(team))
    team.pop("_id", None)
    return team


@api_router.get("/teams")
async def list_teams(user: dict = Depends(get_current_user)):
    return await db.teams.find(
        {"$or": [{"owner_id": user["user_id"]}, {"members.user_id": user["user_id"]}]},
        {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/teams/{team_id}")
async def get_team(team_id: str, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    is_member = (team["owner_id"] == user["user_id"]
                 or any(m.get("user_id") == user["user_id"] for m in team.get("members", [])))
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
    # include pending invites
    invites = await db.team_invites.find({"team_id": team_id}, {"_id": 0}).to_list(100)
    team["pending_invites"] = invites
    return team


@api_router.post("/teams/{team_id}/invite")
async def invite_to_team(team_id: str, body: TeamInviteCreate,
                         user: dict = Depends(get_current_user)):
    require_feature(user, "team_templates")
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the team owner can invite members")
    email = body.email.lower().strip()
    # Already a member?
    if any((m.get("email") or "").lower() == email for m in team.get("members", [])):
        raise HTTPException(status_code=400, detail="That person is already on the team")
    # Already an existing user? -> add directly.
    existing = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if existing:
        member = {
            "user_id": existing["user_id"], "email": existing["email"],
            "name": existing.get("name") or existing["email"], "role": "member",
            "added_at": now_iso(),
        }
        await db.teams.update_one({"team_id": team_id}, {"$push": {"members": member}})
        return {"ok": True, "added": True, "member": member}
    # Otherwise record a pending invite, auto-fulfilled when they sign up.
    invite = {
        "invite_id": f"inv_{uuid.uuid4().hex[:12]}",
        "team_id": team_id, "team_name": team["name"],
        "email": email, "invited_by": user["email"], "created_at": now_iso(),
    }
    await db.team_invites.update_one(
        {"team_id": team_id, "email": email},
        {"$setOnInsert": invite}, upsert=True)
    return {"ok": True, "added": False, "invite": invite}


@api_router.delete("/teams/{team_id}/members/{member_user_id}")
async def remove_team_member(team_id: str, member_user_id: str,
                             user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team["owner_id"] != user["user_id"] and member_user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the owner can remove other members")
    if member_user_id == team["owner_id"]:
        raise HTTPException(status_code=400, detail="The owner cannot be removed")
    await db.teams.update_one(
        {"team_id": team_id}, {"$pull": {"members": {"user_id": member_user_id}}})
    return {"ok": True}


@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete the team")
    # Unshare any templates owned by this team
    await db.templates.update_many(
        {"team_id": team_id}, {"$set": {"shared_with_team": False, "team_id": None}})
    await db.team_invites.delete_many({"team_id": team_id})
    await db.teams.delete_one({"team_id": team_id})
    return {"ok": True}


# ---- Template sharing ----
@api_router.patch("/templates/{template_id}/share")
async def update_template_sharing(template_id: str, body: TemplateShareUpdate,
                                  user: dict = Depends(get_current_user)):
    tpl = await get_template_owned(template_id, user)
    if body.shared_with_team is None:
        return tpl
    if body.shared_with_team:
        require_feature(user, "team_templates")
        # Ensure the user has a team to share into. Auto-create one if needed.
        team_id = tpl.get("team_id")
        if not team_id:
            team = await db.teams.find_one({"owner_id": user["user_id"]}, {"team_id": 1, "_id": 0})
            if not team:
                tid = f"team_{uuid.uuid4().hex[:14]}"
                await db.teams.insert_one({
                    "team_id": tid, "name": f"{user.get('name') or user['email']}'s team",
                    "owner_id": user["user_id"],
                    "members": [{"user_id": user["user_id"], "email": user["email"],
                                 "name": user.get("name") or user["email"],
                                 "role": "owner", "added_at": now_iso()}],
                    "created_at": now_iso(),
                })
                team_id = tid
            else:
                team_id = team["team_id"]
        await db.templates.update_one(
            {"template_id": template_id},
            {"$set": {"shared_with_team": True, "team_id": team_id, "updated_at": now_iso()}})
    else:
        await db.templates.update_one(
            {"template_id": template_id},
            {"$set": {"shared_with_team": False, "updated_at": now_iso()}})
    fresh = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    return fresh


# ===========================================================================
# COMMENTS & COLLABORATION (Feature 3)
# ===========================================================================
async def _can_access_envelope(env: dict, user: dict) -> bool:
    if env["owner_id"] == user["user_id"]:
        return True
    return any((r.get("email") or "").lower() == user["email"].lower()
               for r in env.get("recipients", []))


@api_router.get("/envelopes/{envelope_id}/comments")
async def list_comments(envelope_id: str, user: dict = Depends(get_current_user)):
    assert_can_view_envelope_confidential(user)
    env = await db.envelopes.find_one({"envelope_id": envelope_id}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    if not await _can_access_envelope(env, user):
        raise HTTPException(status_code=403, detail="Not authorised to view this envelope")
    if not await owner_has_feature(env["owner_id"], "comments"):
        return []
    comments = await db.comments.find(
        {"envelope_id": envelope_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return comments


@api_router.post("/envelopes/{envelope_id}/comments")
async def create_comment(envelope_id: str, body: CommentCreate, request: Request,
                         user: dict = Depends(get_current_user)):
    env = await db.envelopes.find_one({"envelope_id": envelope_id}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    if not await _can_access_envelope(env, user):
        raise HTTPException(status_code=403, detail="Not authorised to comment on this envelope")
    if not await owner_has_feature(env["owner_id"], "comments"):
        raise HTTPException(status_code=402, detail=(
            "Real-time commenting requires the envelope owner to be on a Pro plan or higher."
        ))
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:14]}",
        "envelope_id": envelope_id,
        "author_id": user["user_id"],
        "author_name": user.get("name") or user["email"],
        "author_email": user["email"],
        "body": body.body.strip(),
        "page": body.page,
        "x": body.x,
        "y": body.y,
        "parent_id": body.parent_id,
        "created_at": now_iso(),
    }
    await db.comments.insert_one(dict(comment))
    env.setdefault("audit_events", []).append(
        audit_event(user["email"], "Commented", client_ip(request),
                    detail=body.body.strip()[:120]))
    comment.pop("_id", None)
    return comment


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    cmt = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not cmt:
        raise HTTPException(status_code=404, detail="Comment not found")
    env = await db.envelopes.find_one({"envelope_id": cmt["envelope_id"]}, {"_id": 0})
    is_author = cmt.get("author_id") == user["user_id"]
    is_owner = env and env.get("owner_id") == user["user_id"]
    if not (is_author or is_owner):
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    await db.comments.delete_one({"comment_id": comment_id})
    return {"ok": True}


@api_router.get("/envelopes/{envelope_id}/comments/stream")
async def comments_stream(envelope_id: str, request: Request,
                          user: dict = Depends(get_current_user_sse)):
    """Server-Sent Events: push new comments to connected clients."""
    env = await db.envelopes.find_one({"envelope_id": envelope_id}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    if not await _can_access_envelope(env, user):
        raise HTTPException(status_code=403, detail="Not authorised")
    if not await owner_has_feature(env["owner_id"], "comments"):
        raise HTTPException(status_code=402, detail=(
            "Real-time commenting requires the envelope owner to be on a Pro plan or higher."
        ))

    async def event_generator():
        last_ts = ""
        initial = await db.comments.find(
            {"envelope_id": envelope_id}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
        if initial:
            last_ts = initial[0].get("created_at", "")
        yield f"data: {json.dumps({'type': 'hello', 'count': await db.comments.count_documents({'envelope_id': envelope_id})})}\n\n"
        idle_ticks = 0
        while idle_ticks < 900:  # ~30 min at 2s intervals
            if await request.is_disconnected():
                break
            query = {"envelope_id": envelope_id}
            if last_ts:
                query["created_at"] = {"$gt": last_ts}
            new = await db.comments.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
            if new:
                last_ts = new[-1]["created_at"]
                yield f"data: {json.dumps({'type': 'comments', 'comments': new})}\n\n"
                idle_ticks = 0
            else:
                idle_ticks += 1
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --------------------------------------------------------------------------
# App wiring (must run after all routes are registered on routers)
# --------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(org_router)
app.include_router(admin_org_router)
app.include_router(ai_router)
app.include_router(contacts_router)
app.include_router(powerforms_router)
app.include_router(public_router)
app.include_router(vault_router)
app.include_router(blog_admin_router)
app.include_router(blog_public_router)
app.include_router(careers_admin_router)
app.include_router(careers_public_router)
app.include_router(assistant_router)
app.include_router(billing_router)
app.include_router(pdf_router)
app.include_router(integrations_router)
app.include_router(v1_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=get_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Original-Bytes",
        "X-Compressed-Bytes",
        "X-Savings-Percent",
    ],
)


@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    response = await call_next(request)
    for key, value in security_headers().items():
        response.headers[key] = value
    return response


async def _process_auto_reminders():
    """Send scheduled reminder emails for envelopes with auto_remind enabled."""
    import email_service
    base = (os.environ.get("FRONTEND_URL") or os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")[0]).rstrip("/")
    now = now_iso()
    cursor = db.envelopes.find({
        "status": {"$in": ["sent", "viewed"]},
        "auto_remind.enabled": True,
        "auto_remind.next_remind_at": {"$lte": now},
    }, {"_id": 0}).limit(50)
    async for env in cursor:
        ar = env.get("auto_remind") or {}
        if ar.get("sent_count", 0) >= ar.get("max_reminders", 3):
            continue
        reminded = 0
        for r in env.get("recipients", []):
            if can_sign(env, r):
                link = f"{base}/sign/{r['access_token']}"
                email_service.send_signing_invite(
                    r["email"], r["name"], env.get("owner_name", ""),
                    env.get("title", ""), link, env.get("message"),
                    subject_prefix="Reminder: ",
                )
                reminded += 1
        if reminded:
            interval = ar.get("interval_days", 3)
            next_at = (datetime.now(timezone.utc) + timedelta(days=interval)).isoformat()
            env.setdefault("audit_events", []).append(
                audit_event("system", "Auto-reminder sent", "-",
                            f"Reminder {ar.get('sent_count', 0) + 1} to {reminded} recipient(s)"))
            await db.envelopes.update_one(
                {"envelope_id": env["envelope_id"]},
                {"$set": {
                    "audit_events": env["audit_events"],
                    "auto_remind.last_remind_at": now,
                    "auto_remind.next_remind_at": next_at,
                    "auto_remind.sent_count": ar.get("sent_count", 0) + 1,
                    "updated_at": now,
                }},
            )


async def expiry_loop():
    """Periodically mark overdue active envelopes as expired and fire auto-reminders."""
    while True:
        try:
            now = now_iso()
            await db.envelopes.update_many(
                {"status": {"$in": ["sent", "viewed"]},
                 "expires_at": {"$ne": None, "$lt": now}},
                {"$set": {"status": "expired", "updated_at": now}})
            await _process_auto_reminders()
        except Exception as e:
            logger.warning(f"expiry loop: {e}")
        await asyncio.sleep(300)


@app.on_event("startup")
async def startup():
    assert_safe_production()
    assert_document_encryption_key()
    # Single source of truth: collections, indexes, TTLs, and validators.
    try:
        await ensure_database(db)
    except Exception as e:
        logger.warning(f"schema ensure: {e}")
    await seed_admin()
    if os.environ.get("SEED_PILOT_ACCOUNTS", "").lower() in ("1", "true", "yes"):
        logger.info("Pilot accounts enabled (free/pro/business/org/admin)")
    asyncio.create_task(expiry_loop())
    # Credentials are never written to disk — configure ADMIN_EMAIL / ADMIN_PASSWORD in env.
    commit = os.environ.get("RENDER_GIT_COMMIT", "local")[:7]
    logger.info("CivicSign backend started (commit %s)", commit)
    try:
        from billing import _production_requires_live, _stripe_key_mode
        mode = _stripe_key_mode()
        if _production_requires_live():
            if mode == "live":
                logger.info("Stripe billing: LIVE mode (real card payments enabled)")
            else:
                logger.error(
                    "Stripe billing: TEST/invalid key on production — upgrades blocked until sk_live_ is set"
                )
        elif mode:
            logger.info("Stripe billing: %s mode (dev/local)", mode)
    except Exception as e:
        logger.warning("Stripe billing status check skipped: %s", e)


@app.on_event("shutdown")
async def shutdown():
    from db import client
    client.close()
