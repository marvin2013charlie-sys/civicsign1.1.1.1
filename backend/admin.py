"""Admin (internal team) APIs for CIVICSIGN.

All endpoints require an authenticated user whose `role == "admin"`.
Provides platform analytics, user management, envelope oversight, and a
contact-message inbox.
"""
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

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
    """Platform-wide KPIs + 14-day signup/envelope series."""
    users = await db.users.find(
        {}, {"_id": 0, "created_at": 1, "plan": 1, "role": 1, "active": 1}).to_list(20000)
    envs = await db.envelopes.find(
        {}, {"_id": 0, "status": 1, "created_at": 1}).to_list(50000)

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

    templates_total = await db.templates.count_documents({})
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
    }


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
