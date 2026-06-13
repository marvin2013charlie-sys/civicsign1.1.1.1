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
from models import AdminUserUpdate, ContactHandle, ImpersonateVerify, SendReset, RefundRequest

try:
    import stripe as stripe_sdk  # official Stripe SDK for refunds
except Exception:  # pragma: no cover
    stripe_sdk = None

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



# ============================================================================
# BILLING & REFUNDS (super-admin tooling)
# ============================================================================

def _enrich_tx(tx: dict, users_map: dict) -> dict:
    """Attach lightweight user info to a transaction row."""
    u = users_map.get(tx.get("user_id")) or {}
    tx["user_name"] = u.get("name") or u.get("email") or "—"
    tx["user_email"] = u.get("email") or tx.get("email") or "—"
    tx["user_plan"] = u.get("plan")
    return tx


@admin_router.get("/transactions")
async def list_transactions(
    q: str = Query("", description="Search by email or session id"),
    status: str = Query("all", description="all | paid | pending | refunded | failed"),
    admin: dict = Depends(require_admin),
):
    """All Stripe payment attempts, newest first, with user info."""
    query: dict = {}
    if status == "paid":
        query = {"payment_status": "paid", "refund_status": {"$in": [None, "none"]}}
    elif status == "pending":
        query = {"payment_status": "pending"}
    elif status == "refunded":
        query = {"refund_status": {"$in": ["refunded", "partial"]}}
    elif status == "failed":
        query = {"payment_status": {"$in": ["failed", "canceled", "expired"]}}

    if q.strip():
        rgx = {"$regex": q.strip(), "$options": "i"}
        query = {"$and": [query, {"$or": [{"email": rgx}, {"session_id": rgx}, {"tx_id": rgx}]}]} if query else \
                {"$or": [{"email": rgx}, {"session_id": rgx}, {"tx_id": rgx}]}

    txs = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    user_ids = list({t.get("user_id") for t in txs if t.get("user_id")})
    users = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "plan": 1},
    ).to_list(5000) if user_ids else []
    users_map = {u["user_id"]: u for u in users}
    return [_enrich_tx(t, users_map) for t in txs]


@admin_router.get("/billing/metrics")
async def billing_metrics(admin: dict = Depends(require_admin)):
    """Revenue KPIs: gross, refunded, net, by plan, last-30-day daily series."""
    txs = await db.payment_transactions.find(
        {}, {"_id": 0, "amount": 1, "currency": 1, "payment_status": 1, "refund_status": 1,
             "refund_amount": 1, "plan_id": 1, "created_at": 1, "updated_at": 1, "processed": 1},
    ).to_list(50000)

    currency = "gbp"
    gross = 0.0
    refunded = 0.0
    paid_count = 0
    refunded_count = 0
    by_plan = {}  # plan_id -> {count, gross, refunded, net}

    for t in txs:
        amt = float(t.get("amount") or 0)
        paid = t.get("payment_status") == "paid"
        ref_status = t.get("refund_status") or "none"
        ref_amount = float(t.get("refund_amount") or 0)
        plan = t.get("plan_id") or "unknown"
        by_plan.setdefault(plan, {"count": 0, "gross": 0.0, "refunded": 0.0, "net": 0.0})

        if paid:
            gross += amt
            paid_count += 1
            by_plan[plan]["count"] += 1
            by_plan[plan]["gross"] += amt
        if ref_status in ("refunded", "partial") and ref_amount > 0:
            refunded += ref_amount
            refunded_count += 1
            by_plan[plan]["refunded"] += ref_amount

    for p in by_plan.values():
        p["net"] = round(p["gross"] - p["refunded"], 2)
        p["gross"] = round(p["gross"], 2)
        p["refunded"] = round(p["refunded"], 2)

    # 30-day revenue series
    today = datetime.now(timezone.utc).date()
    series = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        label = (today - timedelta(days=i)).strftime("%b %d")
        day_gross = 0.0
        day_ref = 0.0
        for t in txs:
            ca = (t.get("created_at") or "")[:10]
            ua = (t.get("updated_at") or "")[:10]
            if ca == d and t.get("payment_status") == "paid":
                day_gross += float(t.get("amount") or 0)
            if ua == d and (t.get("refund_status") in ("refunded", "partial")):
                day_ref += float(t.get("refund_amount") or 0)
        series.append({"date": label, "gross": round(day_gross, 2), "refunded": round(day_ref, 2)})

    return {
        "currency": currency,
        "totals": {
            "gross": round(gross, 2),
            "refunded": round(refunded, 2),
            "net": round(gross - refunded, 2),
            "paid_count": paid_count,
            "refunded_count": refunded_count,
            "transactions": len(txs),
        },
        "by_plan": by_plan,
        "series": series,
    }


@admin_router.post("/transactions/{tx_id}/refund")
async def refund_transaction(tx_id: str, body: RefundRequest, admin: dict = Depends(require_admin)):
    """Issue a Stripe refund for a paid transaction.

    - Full refund when `amount` is omitted; otherwise partial refund.
    - Optionally downgrades the user's plan back to `free`.
    - Records a refund event on the transaction and in `admin_audit`.
    """
    tx = await db.payment_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Only paid transactions can be refunded")
    if tx.get("refund_status") == "refunded":
        raise HTTPException(status_code=400, detail="This payment has already been fully refunded")

    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key or stripe_sdk is None:
        raise HTTPException(
            status_code=500,
            detail="Refunds unavailable: Stripe is not configured on the server (STRIPE_API_KEY missing).",
        )

    paid_amount = float(tx.get("amount") or 0)
    already_ref = float(tx.get("refund_amount") or 0)
    refund_amount = float(body.amount) if body.amount is not None else (paid_amount - already_ref)
    if refund_amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be greater than zero")
    if refund_amount + already_ref > paid_amount + 1e-6:
        raise HTTPException(status_code=400, detail="Refund amount exceeds remaining refundable balance")

    stripe_sdk.api_key = api_key
    # Stripe needs the cents value
    amount_cents = int(round(refund_amount * 100))
    metadata = {
        "tx_id": tx_id,
        "user_id": tx.get("user_id") or "",
        "admin_id": admin["user_id"],
        "admin_email": admin["email"],
        "reason_note": (body.reason or "")[:480],
    }

    try:
        # Prefer payment_intent if we have it; otherwise refund by Checkout Session.
        refund_kwargs = {"amount": amount_cents, "metadata": metadata}
        if tx.get("payment_intent_id"):
            refund_kwargs["payment_intent"] = tx["payment_intent_id"]
        else:
            # Look up the PI from the Checkout session
            sess = stripe_sdk.checkout.Session.retrieve(tx["session_id"])
            pi = sess.get("payment_intent") if isinstance(sess, dict) else getattr(sess, "payment_intent", None)
            if not pi:
                raise HTTPException(status_code=400, detail="Could not resolve payment intent for this session")
            refund_kwargs["payment_intent"] = pi
            await db.payment_transactions.update_one(
                {"tx_id": tx_id}, {"$set": {"payment_intent_id": pi}}
            )
        refund = stripe_sdk.Refund.create(**refund_kwargs)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] Stripe refund failed for tx={tx_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe refund failed: {e}")

    new_total_refunded = round(already_ref + refund_amount, 2)
    new_status = "refunded" if abs(new_total_refunded - paid_amount) < 1e-6 else "partial"
    now = datetime.now(timezone.utc).isoformat()
    refund_event = {
        "refund_id": getattr(refund, "id", None) or (refund.get("id") if isinstance(refund, dict) else None),
        "amount": refund_amount,
        "reason": body.reason,
        "by_admin_id": admin["user_id"],
        "by_admin_email": admin["email"],
        "at": now,
    }
    await db.payment_transactions.update_one(
        {"tx_id": tx_id},
        {
            "$set": {
                "refund_status": new_status,
                "refund_amount": new_total_refunded,
                "last_refund_at": now,
                "updated_at": now,
            },
            "$push": {"refunds": refund_event},
        },
    )

    # Optionally downgrade the user's plan back to free
    plan_changed = False
    if body.downgrade_plan and new_status == "refunded" and tx.get("user_id"):
        await db.users.update_one(
            {"user_id": tx["user_id"]},
            {"$set": {"plan": "free", "plan_updated_at": now}},
        )
        plan_changed = True

    await db.admin_audit.insert_one({
        "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
        "action": "refund_transaction",
        "admin_id": admin["user_id"],
        "admin_email": admin["email"],
        "target_user_id": tx.get("user_id"),
        "target_email": tx.get("email"),
        "tx_id": tx_id,
        "amount": refund_amount,
        "reason": body.reason,
        "refund_id": refund_event["refund_id"],
        "at": now,
    })

    fresh = await db.payment_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
    return {
        "ok": True,
        "refund_status": new_status,
        "refund_amount": new_total_refunded,
        "plan_downgraded": plan_changed,
        "transaction": fresh,
    }


@admin_router.get("/audit-log")
async def admin_audit_log(
    limit: int = Query(200, ge=1, le=2000),
    action: str = Query("all"),
    admin: dict = Depends(require_admin),
):
    """Recent admin actions (impersonate, password resets, refunds)."""
    query: dict = {}
    if action != "all":
        query["action"] = action
    items = await db.admin_audit.find(query, {"_id": 0}).sort("at", -1).to_list(limit)
    return items
