"""Admin (internal team) APIs for CIVICSIGN.

All endpoints require an authenticated user whose `role == "admin"`.
Provides platform analytics, user management, envelope oversight, and a
contact-message inbox.
"""
import io
import csv
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from db import db
from auth import require_admin
from models import AdminUserUpdate, ContactHandle

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
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = body.role
    if body.plan is not None:
        if body.plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        updates["plan"] = body.plan
    if body.active is not None:
        updates["active"] = body.active

    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")

    # Guard rails: an admin cannot demote or deactivate their own account
    if user_id == admin["user_id"]:
        if updates.get("active") is False:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
        if updates.get("role") == "user":
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user_id})
    return _clean_user(fresh)


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
