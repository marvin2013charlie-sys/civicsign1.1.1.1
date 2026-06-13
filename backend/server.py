"""CIVICSIGN backend — FastAPI app: auth, envelopes, signer flow, finalization."""
import os
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
    UploadFile, File, Form, BackgroundTasks,
)
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware

from db import db, upload_file, download_file, delete_file
import pdf_service
import email_service
from models import (
    EnvelopeUpdate, SendRequest, SignSubmit, DeclineRequest, ContactRequest,
    TemplateCreate, TemplateUse, BulkSend, RemindRequest,
)
from auth import auth_router, get_current_user, seed_admin
from admin import admin_router
from blog_admin import public_router as blog_public_router, admin_router as blog_admin_router
from assistant import assistant_router
from billing import billing_router
from sample_templates import seed_sample_templates

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("civicsign")

app = FastAPI(title="CIVICSIGN API")
api_router = APIRouter(prefix="/api")

RECIPIENT_COLORS = ["#1FB8A6", "#38BDF8", "#F59E0B", "#FB7185", "#84CC16", "#A78BFA"]
DOCX_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def now_human():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def client_ip(request: Request) -> str:
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


async def get_envelope_owned(envelope_id: str, user: dict) -> dict:
    env = await db.envelopes.find_one(
        {"envelope_id": envelope_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Envelope not found")
    return env


async def copy_gridfs(file_id: str, filename: str = "document.pdf") -> str:
    """Duplicate a stored file into a new GridFS object so each entity owns its bytes."""
    data = await download_file(file_id)
    return await upload_file(data, filename)


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
                                 role_to_recipient: dict):
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
            "order": role.get("order", 1), "color": role.get("color", "#1FB8A6"),
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
            "required": f.get("required", True), "label": f.get("label"), "value": None,
        })
    return {
        "envelope_id": f"env_{uuid.uuid4().hex[:16]}",
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


async def finalize_envelope_doc(env: dict):
    """Stamp every collected value, append certificate, persist, email parties."""
    pdf_bytes = await download_file(env["document"]["file_id"])
    fields = []
    for f in env["fields"]:
        if f.get("value") in (None, ""):
            continue
        fields.append({
            "page": f.get("page", 0), "type": f.get("type"),
            "rect_pct": {"x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"]},
            "value": f.get("value"),
        })
    events = list(env["audit_events"]) + [
        audit_event("system", "Envelope completed", "-",
                    "All required fields completed by all recipients")]
    meta = {"envelope_id": env["envelope_id"], "title": env["title"], "status": "Completed"}
    completed_bytes, doc_hash = pdf_service.finalize_envelope(pdf_bytes, fields, meta, events)
    completed_id = await upload_file(
        completed_bytes, f"{env['title']}-completed.pdf".replace(" ", "_"))
    env["audit_events"].append(
        audit_event("system", "Envelope completed", "-", f"Document hash {doc_hash[:16]}…"))
    await db.envelopes.update_one(
        {"envelope_id": env["envelope_id"]},
        {"$set": {"status": "completed", "completed_at": now_iso(),
                  "completed_file_id": completed_id, "doc_hash": doc_hash,
                  "audit_events": env["audit_events"], "updated_at": now_iso()}})
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
    return {"service": "CIVICSIGN", "status": "ok"}


@api_router.post("/contact")
async def contact(body: ContactRequest, request: Request):
    """Public contact form submission (stored; email is best-effort skip-mode)."""
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
                f"<p><b>{doc['name']}</b> ({doc['email']}) wrote:</p>"
                f"<p><b>{doc['subject']}</b></p><p>{doc['message']}</p>",
            )
            _send(support, f"[CIVICSIGN] Contact: {doc['subject']}", html)
    except Exception as e:
        logger.warning(f"contact email skipped: {e}")
    return {"ok": True, "message": "Thanks! We'll get back to you within 1 business day."}


# --------------------------------------------------------------------------
# Envelopes (authenticated sender)
# --------------------------------------------------------------------------

# Per-plan monthly envelope quota (-1 means unlimited).
PLAN_MONTHLY_QUOTA = {"free": 5, "pro": 500, "business": -1}


def _month_window():
    """Return (start_iso, label) for the current calendar month in UTC."""
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat(), now.strftime("%B %Y")


async def _current_month_envelope_count(owner_id: str) -> int:
    start_iso, _ = _month_window()
    return await db.envelopes.count_documents({
        "owner_id": owner_id,
        "created_at": {"$gte": start_iso},
    })


@api_router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    """Current user's monthly envelope quota usage — powers the dashboard meter."""
    plan = user.get("plan", "free")
    limit = PLAN_MONTHLY_QUOTA.get(plan, 5)
    used = await _current_month_envelope_count(user["user_id"])
    _, month_label = _month_window()
    unlimited = limit < 0
    remaining = None if unlimited else max(0, limit - used)
    percent = 0 if unlimited else min(100, round((used / limit) * 100) if limit else 0)
    return {
        "plan": plan,
        "month": month_label,
        "used": used,
        "limit": limit,
        "unlimited": unlimited,
        "remaining": remaining,
        "percent": percent,
    }


@api_router.post("/envelopes")
async def create_envelope(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(None),
    user: dict = Depends(get_current_user),
):
    # ---- Enforce monthly plan quota ----
    plan = user.get("plan", "free")
    limit = PLAN_MONTHLY_QUOTA.get(plan, 5)
    if limit >= 0:
        used = await _current_month_envelope_count(user["user_id"])
        if used >= limit:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"You've reached your {plan.capitalize()} plan limit of {limit} envelopes this month. "
                    "Upgrade your plan to send more."
                ),
            )
    raw = await file.read()
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
        page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    except Exception as e:
        logger.error(f"upload processing error: {e}")
        raise HTTPException(status_code=400, detail=f"Could not process document: {e}")

    file_id = await upload_file(pdf_bytes, fname.rsplit(".", 1)[0] + ".pdf")
    env_title = (title or fname.rsplit(".", 1)[0] or "Untitled Document").strip()
    envelope = {
        "envelope_id": f"env_{uuid.uuid4().hex[:16]}",
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
async def list_envelopes(user: dict = Depends(get_current_user)):
    items = await db.envelopes.find(
        {"owner_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    items = await db.envelopes.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "status": 1, "created_at": 1, "completed_at": 1}).to_list(2000)
    counts = {"draft": 0, "sent": 0, "viewed": 0, "completed": 0, "declined": 0, "expired": 0}
    for it in items:
        s = it.get("status", "draft")
        counts[s] = counts.get(s, 0) + 1
    total = len(items)
    pending = counts["sent"] + counts["viewed"]
    completion_rate = round((counts["completed"] / total) * 100) if total else 0
    series = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        c = sum(1 for it in items if (it.get("created_at") or "")[:10] == d.isoformat())
        series.append({"date": d.strftime("%b %d"), "count": c})
    return {"total": total, "counts": counts, "pending": pending,
            "completion_rate": completion_rate, "series": series}


@api_router.get("/envelopes/{envelope_id}")
async def get_envelope(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    return await maybe_expire(env)


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
        recs = []
        existing_by_id = {r["recipient_id"]: r for r in env["recipients"]}
        for i, r in enumerate(body.recipients):
            rid = r.recipient_id or f"rcp_{uuid.uuid4().hex[:10]}"
            prev = existing_by_id.get(rid, {})
            recs.append({
                "recipient_id": rid, "name": r.name.strip(),
                "email": r.email.lower().strip(), "order": r.order or (i + 1),
                "color": r.color or RECIPIENT_COLORS[i % len(RECIPIENT_COLORS)],
                "status": "pending",
                "access_token": prev.get("access_token") or uuid.uuid4().hex,
                "viewed_at": None, "signed_at": None, "signer_name": None,
            })
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
                "required": f.required, "label": f.label, "value": f.value,
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
    msg = body.message if body.message is not None else env.get("message")
    expires_at = None
    if body.expires_in_days and body.expires_in_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)).isoformat()
    env["status"] = "sent"
    env["sent_at"] = now_iso()
    env["message"] = msg
    env["expires_at"] = expires_at
    env["audit_events"].append(
        audit_event(user["email"], "Sent for signature", client_ip(request),
                    f"{len(env['recipients'])} recipient(s), {env['signing_order']} order"
                    + (f", expires in {body.expires_in_days} days" if expires_at else "")))
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$set": {"status": "sent", "sent_at": env["sent_at"], "message": msg,
                  "expires_at": expires_at,
                  "recipients": env["recipients"], "audit_events": env["audit_events"],
                  "updated_at": now_iso()}})
    base = (body.base_url or "").rstrip("/")
    links = []
    for r in env["recipients"]:
        link = f"{base}/sign/{r['access_token']}" if base else None
        links.append({"recipient_id": r["recipient_id"], "name": r["name"],
                      "email": r["email"], "token": r["access_token"], "sign_url": link})
        if can_sign(env, r) and link:
            email_service.send_signing_invite(
                r["email"], r["name"], env["owner_name"], env["title"], link, msg)
    return {"status": "sent", "links": links}


@api_router.post("/envelopes/{envelope_id}/remind")
async def remind_envelope(envelope_id: str, body: RemindRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    env = await maybe_expire(env)
    if env["status"] not in ("sent", "viewed"):
        raise HTTPException(status_code=400, detail="Only active envelopes can be reminded")
    base = (body.base_url or request.headers.get("origin", "")).rstrip("/")
    reminded = []
    for r in env["recipients"]:
        if can_sign(env, r):
            link = f"{base}/sign/{r['access_token']}" if base else None
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
    return {"reminded": len(reminded), "emails": reminded}


@api_router.post("/envelopes/{envelope_id}/void")
async def void_envelope(envelope_id: str, request: Request,
                        user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if env["status"] in ("completed", "declined"):
        raise HTTPException(status_code=400, detail="Envelope already finalized")
    env["audit_events"].append(audit_event(user["email"], "Envelope voided", client_ip(request)))
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$set": {"status": "declined", "audit_events": env["audit_events"],
                  "updated_at": now_iso()}})
    return {"status": "declined"}


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
    data = await download_file(env["document"]["file_id"])
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline; filename=document.pdf"})


@api_router.get("/envelopes/{envelope_id}/completed")
async def envelope_completed(envelope_id: str, user: dict = Depends(get_current_user)):
    env = await get_envelope_owned(envelope_id, user)
    if not env.get("completed_file_id"):
        raise HTTPException(status_code=404, detail="Document not completed yet")
    data = await download_file(env["completed_file_id"])
    safe = (env["title"] or "document").replace(" ", "_")
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{safe}-completed.pdf"'})


# --------------------------------------------------------------------------
# Templates (authenticated)
# --------------------------------------------------------------------------
async def get_template_owned(template_id: str, user: dict) -> dict:
    tpl = await db.templates.find_one(
        {"template_id": template_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


async def get_usable_template(template_id: str, user: dict) -> dict:
    """Return a template the user may use: their own OR a shared sample template."""
    tpl = await db.templates.find_one(
        {"template_id": template_id,
         "$or": [{"owner_id": user["user_id"]}, {"is_sample": True}]}, {"_id": 0})
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
    new_file = await copy_gridfs(env["document"]["file_id"],
                                 env["document"]["original_filename"])
    role_map, roles = {}, []
    for r in sorted(env["recipients"], key=lambda x: x.get("order", 1)):
        role_id = f"role_{uuid.uuid4().hex[:10]}"
        role_map[r["recipient_id"]] = role_id
        roles.append({"role_id": role_id, "name": r["name"], "order": r.get("order", 1),
                      "color": r.get("color", "#1FB8A6")})
    fields = [{
        "field_id": f"fld_{uuid.uuid4().hex[:10]}", "role_id": role_map[f["recipient_id"]],
        "page": f["page"], "type": f["type"], "x": f["x"], "y": f["y"], "w": f["w"],
        "h": f["h"], "required": f.get("required", True), "label": f.get("label"),
    } for f in env["fields"] if f["recipient_id"] in role_map]
    tpl = {
        "template_id": f"tpl_{uuid.uuid4().hex[:16]}", "owner_id": user["user_id"],
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
    return await db.templates.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/templates/samples")
async def list_sample_templates(user: dict = Depends(get_current_user)):
    return await db.templates.find({"is_sample": True}, {"_id": 0}).sort("name", 1).to_list(100)


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
    data = await download_file(tpl["document"]["file_id"])
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
    new_file = await copy_gridfs(tpl["document"]["file_id"], tpl["document"]["original_filename"])
    env = build_envelope_from_template(tpl, user, new_file, role_to)
    await db.envelopes.insert_one(dict(env))
    await db.templates.update_one({"template_id": template_id}, {"$inc": {"use_count": 1}})
    env.pop("_id", None)
    return {"envelope_id": env["envelope_id"]}


@api_router.post("/templates/{template_id}/bulk-send")
async def bulk_send_template(template_id: str, body: BulkSend, request: Request,
                             user: dict = Depends(get_current_user)):
    tpl = await get_usable_template(template_id, user)
    if len(tpl["roles"]) != 1:
        raise HTTPException(status_code=400,
                            detail="Bulk send is available for single-signer templates only")
    if not body.rows:
        raise HTTPException(status_code=400, detail="Add at least one recipient row")
    role_id = tpl["roles"][0]["role_id"]
    base = (body.base_url or request.headers.get("origin", "")).rstrip("/")
    created = []
    for row in body.rows:
        new_file = await copy_gridfs(tpl["document"]["file_id"], tpl["document"]["original_filename"])
        env = build_envelope_from_template(
            tpl, user, new_file, {role_id: {"name": row.name, "email": row.email}})
        env["status"] = "sent"
        env["sent_at"] = now_iso()
        env["message"] = body.message or ""
        rcp = env["recipients"][0]
        env["audit_events"].append(
            audit_event(user["email"], "Sent for signature", client_ip(request), "Bulk send"))
        await db.envelopes.insert_one(dict(env))
        link = f"{base}/sign/{rcp['access_token']}" if base else None
        if link:
            email_service.send_signing_invite(
                rcp["email"], rcp["name"], env["owner_name"], env["title"], link, body.message)
        created.append({"envelope_id": env["envelope_id"], "name": rcp["name"],
                        "email": rcp["email"], "sign_url": link})
    await db.templates.update_one({"template_id": template_id},
                                  {"$inc": {"use_count": len(created)}})
    return {"created": len(created), "envelopes": created}


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
async def signer_view(token: str, request: Request):
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
    fields = []
    for f in env["fields"]:
        editable = (f["recipient_id"] == recipient["recipient_id"] and signable
                    and recipient["status"] not in ("signed", "declined"))
        rcolor = next((r["color"] for r in env["recipients"]
                       if r["recipient_id"] == f["recipient_id"]), "#1FB8A6")
        merged = {**f, "editable": editable, "recipient_color": rcolor}
        if (merged.get("value") in (None, "")
                and editable
                and f.get("type") in autofill_map):
            merged["value"] = autofill_map.get(f["type"]) or ""
        fields.append(merged)

    return {
        "envelope_id": env["envelope_id"], "title": env["title"],
        "message": env.get("message"), "sender_name": env.get("owner_name"),
        "status": env["status"], "signing_order": env["signing_order"],
        "document": {"page_count": env["document"]["page_count"],
                     "pages": env["document"]["pages"]},
        "recipient": {"recipient_id": recipient["recipient_id"], "name": recipient["name"],
                      "email": recipient["email"], "color": recipient["color"],
                      "status": recipient["status"], "order": recipient["order"]},
        "fields": fields,
        "signable": signable,
        "already_signed": recipient["status"] == "signed",
        "completed": env["status"] == "completed",
    }


@api_router.get("/sign/{token}/file")
async def signer_file(token: str):
    env, _ = await _find_by_token(token)
    data = await download_file(env["document"]["file_id"])
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline; filename=document.pdf"})


@api_router.get("/sign/{token}/completed")
async def signer_completed(token: str):
    env, _ = await _find_by_token(token)
    if not env.get("completed_file_id"):
        raise HTTPException(status_code=404, detail="Document not completed yet")
    data = await download_file(env["completed_file_id"])
    safe = (env["title"] or "document").replace(" ", "_")
    return FastResponse(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{safe}-completed.pdf"'})


@api_router.post("/sign/{token}/submit")
async def signer_submit(token: str, body: SignSubmit, request: Request,
                        background: BackgroundTasks):
    env, recipient = await _find_by_token(token)
    if not can_sign(env, recipient):
        raise HTTPException(status_code=400,
                            detail="This document is not currently awaiting your signature")
    if not body.consent:
        raise HTTPException(status_code=400, detail="You must consent to sign electronically")

    values = {v.field_id: v.value for v in body.values}
    my_fields = [f for f in env["fields"] if f["recipient_id"] == recipient["recipient_id"]]
    for f in my_fields:
        if f["field_id"] in values:
            f["value"] = values[f["field_id"]]
    missing = [f for f in my_fields if f.get("required") and f.get("value") in (None, "", False)]
    if missing:
        raise HTTPException(status_code=400,
                            detail=f"{len(missing)} required field(s) are not completed")

    ip = client_ip(request)
    for r in env["recipients"]:
        if r["access_token"] == token:
            r["status"] = "signed"
            r["signed_at"] = now_iso()
            r["signer_name"] = body.signer_name or r["name"]
    env["audit_events"].append(audit_event(recipient["email"], "Consent to e-sign accepted", ip))
    env["audit_events"].append(
        audit_event(recipient["email"], "Signed document", ip,
                    f"{len(my_fields)} field(s) completed"))

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

    if all_signed:
        env_full = await db.envelopes.find_one({"envelope_id": env["envelope_id"]}, {"_id": 0})
        background.add_task(finalize_envelope_doc, env_full)
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
async def signer_decline(token: str, body: DeclineRequest, request: Request):
    env, recipient = await _find_by_token(token)
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
    return {"status": "declined"}


# --------------------------------------------------------------------------
# App wiring
# --------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(blog_admin_router)
app.include_router(blog_public_router)
app.include_router(assistant_router)
app.include_router(billing_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def expiry_loop():
    """Periodically mark overdue active envelopes as expired."""
    while True:
        try:
            now = now_iso()
            await db.envelopes.update_many(
                {"status": {"$in": ["sent", "viewed"]},
                 "expires_at": {"$ne": None, "$lt": now}},
                {"$set": {"status": "expired", "updated_at": now}})
        except Exception as e:
            logger.warning(f"expiry loop: {e}")
        await asyncio.sleep(300)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.envelopes.create_index("owner_id")
        await db.envelopes.create_index("envelope_id", unique=True)
        await db.envelopes.create_index("recipients.access_token")
        await db.templates.create_index("owner_id")
        await db.templates.create_index("template_id", unique=True)
    except Exception as e:
        logger.warning(f"index creation: {e}")
    await seed_admin()
    await seed_sample_templates()
    asyncio.create_task(expiry_loop())
    try:
        mem = Path("/app/memory")
        mem.mkdir(parents=True, exist_ok=True)
        (mem / "test_credentials.md").write_text(
            "# CIVICSIGN Test Credentials\n\n"
            "## Demo sender account (email/password)\n"
            f"- Email: {os.environ.get('ADMIN_EMAIL','user@civicsign.app')}\n"
            f"- Password: {os.environ.get('ADMIN_PASSWORD','Welcome@2026!')}\n\n"
            "## Auth endpoints\n"
            "- POST /api/auth/register {name,email,password}\n"
            "- POST /api/auth/login {email,password} -> sets cookies + returns access_token\n"
            "- GET  /api/auth/me (cookie or Bearer)\n"
            "- POST /api/auth/session {session_id} (Google OAuth)\n\n"
            "Note: login/register also return `access_token` in the body for Bearer-based testing.\n"
        )
    except Exception as e:
        logger.warning(f"could not write test_credentials: {e}")
    logger.info("CIVICSIGN backend started")


@app.on_event("shutdown")
async def shutdown():
    from db import client
    client.close()
