"""Admin (internal team) APIs for CIVICSIGN.

All endpoints require an authenticated user whose `role == "admin"`.
Provides platform analytics, user management, envelope oversight, and a
contact-message inbox.
"""
import io
import csv
import os
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request

import email_service
from db import db
from auth import require_admin, _public_user, create_access_token, create_password_reset
from models import AdminUserUpdate, ContactHandle, ImpersonateVerify, SendReset

logger = logging.getLogger("civicsign.admin")

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

STATUSES = ["draft", "sent", "viewed", "completed", "declined", "expired"]
PLANS = ["free", "pro", "business"]
ROLES = ["user", "admin"]


def _clean_user(doc: dict) -> dict:
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@admin_router.get("/metrics")
async def metrics(admin: dict = Depends(require_admin)):
    """Platform-wide KPIs + 14-day signup/envelope series + deeper analytics."""
    users = await db.users.find(
        {}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "created_at": 1,
             "plan": 1, "role": 1, "active": 1}).to_list(20000)
    envs = await db.envelopes.find(
        {}, {"_id": 0, "status": 1, "created_at": 1, "sent_at": 1,
             "completed_at": 1, "owner_id": 1}).to_list(50000)

    status_counts = {s: 0 for s in STATUSES}
    for e in envs:
        s = e.get("status", "draft")
        status_counts[s] = status_counts.get(s, 0) + 1

    plan_counts = {p: 0 for p in PLANS}
    active_users = 0
    admin_users = 0
    for u in users:
        plan_counts[u.get("plan", "free")] = plan_counts.get(u.get("plan", "free"), 0) + 1
        if u.get("active", True):
            active_users += 1
        if u.get("role") == "admin":
            admin_users += 1

    total_envelopes = len(envs)
    completed = status_counts.get("completed", 0)
    completion_rate = round((completed / total_envelopes) * 100) if total_envelopes else 0

    templates_total = await db.templates.count_documents({"is_sample": {"$ne": True}})
    contacts_total = await db.contact_messages.count_documents({})
    contacts_unhandled = await db.contact_messages.count_documents({"handled": False})

    # 14-day series
    today = datetime.now(timezone.utc).date()
    signup_series, envelope_series = [], []
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        label = (today - timedelta(days=i)).strftime("%b %d")
        signups = sum(1 for u in users if (u.get("created_at") or "")[:10] == d)
        created = sum(1 for e in envs if (e.get("created_at") or "")[:10] == d)
        signup_series.append({"date": label, "count": signups})
        envelope_series.append({"date": label, "count": created})

    # ---- Deeper analytics ----
    ever_sent = sum(1 for e in envs if e.get("sent_at"))
    declined = status_counts.get("declined", 0)
    expired = status_counts.get("expired", 0)
    reached_viewed = sum(1 for e in envs if e.get("status") in ("viewed", "completed"))

    durations = []
    for e in envs:
        if e.get("status") == "completed" and e.get("sent_at") and e.get("completed_at"):
            try:
                t0 = datetime.fromisoformat(e["sent_at"])
                t1 = datetime.fromisoformat(e["completed_at"])
                hrs = (t1 - t0).total_seconds() / 3600.0
                if hrs >= 0:
                    durations.append(hrs)
            except Exception:
                pass
    avg_tts = round(sum(durations) / len(durations), 1) if durations else 0

    # Top active users (by owned envelope count)
    top_agg = await db.envelopes.aggregate([
        {"$group": {"_id": "$owner_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}, {"$limit": 5},
    ]).to_list(5)
    umap = {u["user_id"]: u for u in users}
    top_users = []
    for a in top_agg:
        u = umap.get(a["_id"])
        if not u:
            continue
        top_users.append({"name": u.get("name") or u.get("email"),
                          "email": u.get("email"), "count": a["count"]})

    analytics = {
        "avg_time_to_sign_hours": avg_tts,
        "declined": declined,
        "expired": expired,
        "decline_rate": round((declined / ever_sent) * 100) if ever_sent else 0,
        "expired_rate": round((expired / ever_sent) * 100) if ever_sent else 0,
        "funnel": [
            {"stage": "Sent", "count": ever_sent},
            {"stage": "Viewed", "count": reached_viewed},
            {"stage": "Completed", "count": completed},
        ],
        "top_users": top_users,
    }

    return {
        "totals": {
            "users": len(users),
            "active_users": active_users,
            "admins": admin_users,
            "envelopes": total_envelopes,
            "completed": completed,
            "completion_rate": completion_rate,
            "templates": templates_total,
            "contacts": contacts_total,
            "contacts_unhandled": contacts_unhandled,
        },
        "status_counts": status_counts,
        "plan_counts": plan_counts,
        "signup_series": signup_series,
        "envelope_series": envelope_series,
        "analytics": analytics,
    }


def _csv_response(headers, rows, filename):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    return Response(
        content=buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@admin_router.get("/export/users.csv")
async def export_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(20000)
    rows = [[u.get("name", ""), u.get("email", ""), u.get("role", "user"),
             u.get("plan", "free"), "yes" if u.get("active", True) else "no",
             u.get("mobile") or "", u.get("created_at", "")] for u in users]
    return _csv_response(
        ["Name", "Email", "Role", "Plan", "Active", "Mobile", "Created"],
        rows, "civicsign_users.csv")


@admin_router.get("/export/envelopes.csv")
async def export_envelopes(admin: dict = Depends(require_admin)):
    envs = await db.envelopes.find(
        {}, {"_id": 0, "title": 1, "owner_name": 1, "status": 1, "recipients": 1,
             "created_at": 1, "sent_at": 1, "completed_at": 1}).sort("created_at", -1).to_list(50000)
    rows = [[e.get("title", ""), e.get("owner_name", ""), e.get("status", ""),
             len(e.get("recipients", []) or []), e.get("created_at", ""),
             e.get("sent_at") or "", e.get("completed_at") or ""] for e in envs]
    return _csv_response(
        ["Title", "Owner", "Status", "Recipients", "Created", "Sent", "Completed"],
        rows, "civicsign_envelopes.csv")


@admin_router.get("/export/contacts.csv")
async def export_contacts(admin: dict = Depends(require_admin)):
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(20000)
    rows = [[c.get("name", ""), c.get("email", ""), c.get("subject", ""),
             (c.get("message", "") or "").replace("\n", " "),
             "yes" if c.get("handled") else "no", c.get("created_at", "")] for c in items]
    return _csv_response(
        ["Name", "Email", "Subject", "Message", "Handled", "Created"],
        rows, "civicsign_contacts.csv")


@admin_router.get("/users")
async def list_users(
    q: str = Query("", description="Search by name or email"),
    admin: dict = Depends(require_admin),
):
    query = {}
    if q.strip():
        rgx = {"$regex": q.strip(), "$options": "i"}
        query = {"$or": [{"email": rgx}, {"name": rgx}]}
    users = await db.users.find(query, {"password_hash": 0, "_id": 0}).sort("created_at", -1).to_list(2000)

    # Envelope counts per owner via a single aggregation
    agg = await db.envelopes.aggregate(
        [{"$group": {"_id": "$owner_id", "count": {"$sum": 1}}}]).to_list(20000)
    counts = {a["_id"]: a["count"] for a in agg}
    for u in users:
        u["envelope_count"] = counts.get(u["user_id"], 0)
    return users


@admin_router.patch("/users/{user_id}")
async def update_user(user_id: str, body: AdminUserUpdate, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    # Role promotion/demotion is intentionally NOT allowed from the portal.
    # Admin accounts can only be provisioned on the backend (seed/env).
    if body.role is not None and body.role != target.get("role", "user"):
        raise HTTPException(
            status_code=403,
            detail="Admin roles can only be assigned on the backend. Signed-up users cannot be promoted to admin from the portal.")
    if body.plan is not None:
        if body.plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        updates["plan"] = body.plan
    if body.active is not None:
        updates["active"] = body.active

    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")

    # Guard rail: an admin cannot deactivate their own account
    if user_id == admin["user_id"] and updates.get("active") is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user_id})
    return _clean_user(fresh)


@admin_router.get("/users/{user_id}")
async def user_detail(user_id: str, admin: dict = Depends(require_admin)):
    """Full account detail + help/diagnostics for one user."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target = _clean_user(target)

    envs = await db.envelopes.find(
        {"owner_id": user_id},
        {"_id": 0, "envelope_id": 1, "title": 1, "status": 1,
         "created_at": 1, "sent_at": 1, "completed_at": 1}).sort("created_at", -1).to_list(2000)

    stats = {s: 0 for s in STATUSES}
    for e in envs:
        stats[e.get("status", "draft")] = stats.get(e.get("status", "draft"), 0) + 1
    templates_count = await db.templates.count_documents({"owner_id": user_id})

    email_ok = email_service.is_configured()
    diagnostics = {
        "email_configured": email_ok,
        "sender_email": os.environ.get("SENDER_EMAIL") or None,
        "account_active": target.get("active", True),
        "auth_provider": target.get("auth_provider", "password"),
        "can_send_email": email_ok,
        "email_note": (
            "SendGrid is configured \u2014 invites & notifications are emailed."
            if email_ok else
            "SendGrid is NOT configured (skip-mode). Recipients get shareable links instead of emails; "
            "set SENDGRID_API_KEY and SENDER_EMAIL to enable real delivery."),
    }

    return {
        "user": target,
        "stats": {
            "total": len(envs),
            "completed": stats.get("completed", 0),
            "sent": stats.get("sent", 0),
            "viewed": stats.get("viewed", 0),
            "draft": stats.get("draft", 0),
            "declined": stats.get("declined", 0),
            "expired": stats.get("expired", 0),
            "templates": templates_count,
        },
        "recent_envelopes": envs[:10],
        "diagnostics": diagnostics,
    }


@admin_router.post("/users/{user_id}/send-reset")
async def send_password_reset_link(user_id: str, body: SendReset, admin: dict = Depends(require_admin)):
    """Generate a password-reset link for a user. Emails it when SendGrid is
    configured; otherwise returns the link so the admin can share it."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not target.get("password_hash") and target.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="This account signs in with Google and has no password to reset.")

    token = await create_password_reset(user_id)
    base = (body.base_url or "").rstrip("/")
    reset_link = f"{base}/reset-password?token={token}"
    status = email_service.send_password_reset(target["email"], target.get("name"), reset_link)
    await db.admin_audit.insert_one({
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}", "action": "send_password_reset",
        "admin_id": admin["user_id"], "admin_email": admin["email"],
        "target_user_id": user_id, "target_email": target["email"],
        "at": datetime.now(timezone.utc).isoformat(),
    })
    return {"reset_link": reset_link, "emailed": status == "sent",
            "email_status": status, "email": target["email"]}


@admin_router.post("/users/{user_id}/impersonate/request")
async def impersonate_request(user_id: str, admin: dict = Depends(require_admin)):
    """Step 1 of impersonation: issue a one-time OTP (shown on-screen in dev mode)."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="You cannot impersonate another admin account.")
    if target.get("active") is False:
        raise HTTPException(status_code=400, detail="Reactivate this account before entering it.")

    request_id = f"imp_{uuid.uuid4().hex[:16]}"
    otp = f"{secrets.randbelow(900000) + 100000}"
    await db.impersonation_otps.insert_one({
        "request_id": request_id, "admin_id": admin["user_id"],
        "target_user_id": user_id, "otp": otp, "used": False,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Impersonation OTP for admin={admin['email']} target={target['email']} otp={otp}")
    # dev_mode True -> OTP returned in response since email is not live.
    return {"request_id": request_id, "otp": otp, "dev_mode": True,
            "expires_in": 300, "target_email": target["email"]}


@admin_router.post("/users/{user_id}/impersonate/verify")
async def impersonate_verify(user_id: str, body: ImpersonateVerify, admin: dict = Depends(require_admin)):
    """Step 2: verify the OTP and mint an access token for the target user."""
    rec = await db.impersonation_otps.find_one({
        "request_id": body.request_id, "admin_id": admin["user_id"], "target_user_id": user_id})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or already-used verification code")
    try:
        expired = datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc)
    except Exception:
        expired = True
    if expired:
        raise HTTPException(status_code=400, detail="This verification code has expired. Please request a new one.")
    if (body.otp or "").strip() != rec["otp"]:
        raise HTTPException(status_code=400, detail="Incorrect verification code")

    await db.impersonation_otps.update_one({"request_id": body.request_id}, {"$set": {"used": True}})

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token(target["user_id"], target["email"])
    await db.admin_audit.insert_one({
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}", "action": "impersonate",
        "admin_id": admin["user_id"], "admin_email": admin["email"],
        "target_user_id": user_id, "target_email": target["email"],
        "at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Impersonation GRANTED admin={admin['email']} -> target={target['email']}")
    return {"access_token": token, "user": _public_user(target)}


@admin_router.get("/envelopes")
async def list_all_envelopes(
    q: str = Query(""),
    status: str = Query("all"),
    admin: dict = Depends(require_admin),
):
    query = {}
    if status != "all":
        query["status"] = status
    if q.strip():
        query["title"] = {"$regex": q.strip(), "$options": "i"}
    items = await db.envelopes.find(
        query,
        {"_id": 0, "audit_events": 0, "fields": 0},
    ).sort("created_at", -1).to_list(500)
    # Trim recipients to a light summary
    for it in items:
        it["recipient_count"] = len(it.get("recipients", []) or [])
        it.pop("recipients", None)
    return items


@admin_router.get("/contact-messages")
async def list_contacts(admin: dict = Depends(require_admin)):
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


@admin_router.patch("/contact-messages/{contact_id}")
async def handle_contact(contact_id: str, body: ContactHandle, admin: dict = Depends(require_admin)):
    res = await db.contact_messages.update_one(
        {"contact_id": contact_id}, {"$set": {"handled": body.handled}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True, "handled": body.handled}
