"""Admin (internal team) APIs for CivicSign.

All endpoints require an authenticated user whose `role == "admin"`.
Provides platform analytics, user management, envelope oversight, and a
contact-message inbox.

SECURITY HARDENING:
- NoSQL injection prevention via parameterized queries
- Input validation and sanitization on all parameters
- Rate limiting on sensitive operations
- Comprehensive audit logging
- Plan modification protection with signature verification
- XSS prevention via output escaping
- CSRF token validation on state-changing operations
"""
import io
import csv
import hashlib
import os
import uuid
import secrets
import logging
import re
import hmac
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from rate_limits import limiter
from html import escape

import email_service
from db import db
from auth import require_admin, require_permission, _public_user, create_access_token, create_password_reset
from security_utils import is_dev_mode, validate_redirect_base
from models import AdminUserUpdate, ContactHandle, ImpersonateVerify, SendReset, RefundRequest
from billing import downgrade_user_for_plan_refund, _is_plan_purchase_tx

try:
    import stripe as stripe_sdk  # official Stripe SDK for refunds
except Exception:  # pragma: no cover
    stripe_sdk = None

logger = logging.getLogger("civicsign.admin")

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


def _is_super_admin(actor: dict) -> bool:
    """Only role=admin (super-admin). Staff never see envelope metadata."""
    return actor.get("role") == "admin"


_USER_LIST_ROLE_ALIASES = {
    "customer": "user",
    "team": "internal",
    "team_member": "internal",
}


def _normalize_user_list_role(role: str) -> str:
    role = (role or "").strip().lower()
    return _USER_LIST_ROLE_ALIASES.get(role, role)


def _no_org_clause() -> dict:
    return {"$or": [
        {"org_id": {"$exists": False}},
        {"org_id": None},
        {"org_id": ""},
    ]}


def _in_org_clause() -> dict:
    return {"org_id": {"$exists": True, "$nin": [None, ""]}}


def _build_user_list_query(
    *,
    role: str,
    plan: str,
    org: str,
    org_id: str,
    org_role: str,
    q: str,
) -> dict:
    """Compose Mongo filters for admin user list (role, plan tier, org, search)."""
    clauses: list[dict] = []
    role = _normalize_user_list_role(role)

    if role and role != "all":
        if role not in ("user", "staff", "admin", "internal"):
            raise HTTPException(status_code=400, detail="Invalid role filter")
        if role == "internal":
            clauses.append({"role": {"$in": ["staff", "admin"]}})
        elif role == "user":
            clauses.append({"$or": [
                {"role": "user"},
                {"role": {"$exists": False}},
                {"role": None},
            ]})
        else:
            clauses.append({"role": role})

    if plan and plan != "all":
        if role not in ("user", "all", ""):
            raise HTTPException(status_code=400, detail="Plan filter only applies to customer accounts")
        if plan not in ("free", "pro", "business"):
            raise HTTPException(status_code=400, detail="Invalid plan filter")
        if plan == "free":
            clauses.append({"$or": [
                {"plan": "free"},
                {"plan": {"$exists": False}},
                {"plan": None},
            ]})
            clauses.append(_no_org_clause())
        elif plan == "pro":
            clauses.append({"plan": "pro"})
            clauses.append(_no_org_clause())
        else:
            # Solo Business — single-user accounts, not organisation pool members.
            clauses.append({"plan": "business"})
            clauses.append(_no_org_clause())

    org_id = (org_id or "").strip()
    if org_id and org_id != "all":
        if not re.match(r"^org_[a-f0-9]{10,20}$", org_id):
            raise HTTPException(status_code=400, detail="Invalid organisation id")
        if role not in ("user", "all", ""):
            raise HTTPException(status_code=400, detail="Organisation filter only applies to customer accounts")
        clauses.append({"org_id": org_id})
    elif org and org != "all":
        if org not in ("yes", "no"):
            raise HTTPException(status_code=400, detail="Invalid organisation filter")
        if role not in ("user", "all", ""):
            raise HTTPException(status_code=400, detail="Organisation filter only applies to customer accounts")
        if org == "yes":
            clauses.append(_in_org_clause())
        else:
            clauses.append(_no_org_clause())

    org_role = (org_role or "").strip().lower()
    if org_role and org_role != "all":
        if org_role not in ("owner", "member"):
            raise HTTPException(status_code=400, detail="Invalid organisation role filter")
        if role not in ("user", "all", ""):
            raise HTTPException(status_code=400, detail="Organisation role filter only applies to customer accounts")
        clauses.append({"org_role": org_role})

    if q:
        try:
            escaped_q = re.escape(q)
            clauses.append({"$or": [
                {"email": {"$regex": escaped_q, "$options": "i"}},
                {"name": {"$regex": escaped_q, "$options": "i"}},
            ]})
        except Exception as e:
            logger.warning(f"[admin] search query error: {e}")
            raise HTTPException(status_code=400, detail="Invalid search query")

    if not clauses:
        return {}
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


STATUSES = ["draft", "sent", "viewed", "completed", "declined", "expired"]
PLANS = ["free", "pro", "business"]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _impersonation_otp_hash(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def _clean_user(doc: dict) -> dict:
    """Remove sensitive fields from user document."""
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    doc.pop("plan_signature", None)  # Don't expose signature to frontend
    return doc


def _sanitize_string(value: str, max_length: int = 255) -> str:
    """Sanitize string input to prevent injection attacks."""
    if not isinstance(value, str):
        return ""
    # Remove null bytes
    value = value.replace('\x00', '')
    # Truncate to max length
    value = value[:max_length]
    # HTML escape for safe display
    return escape(value)


@admin_router.get("/metrics")
@limiter.limit("10/minute")
async def metrics(request: Request, admin: dict = Depends(require_admin)):
    """Platform-wide KPIs + 14-day signup/envelope series + deeper analytics."""
    try:
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
            top_users.append({
                "user_id": a["_id"],
                "name": u.get("name") or u.get("email"),
                "email": u.get("email"),
                "count": a["count"],
            })

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
    except Exception as e:
        logger.error(f"[admin] metrics endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")


def _csv_response(headers, rows, filename):
    """Generate CSV response with proper escaping."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([escape(str(h)) for h in headers])
    for r in rows:
        writer.writerow([escape(str(cell)) if cell else "" for cell in r])
    return Response(
        content=buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{escape(filename)}"'})


@admin_router.get("/export/users.csv")
@limiter.limit("5/minute")
async def export_users(request: Request, admin: dict = Depends(require_permission("users-read"))):
    """Export user list as CSV."""
    try:
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(20000)
        rows = [[u.get("name", ""), u.get("email", ""), u.get("role", "user"),
                 u.get("plan", "free"), "yes" if u.get("active", True) else "no",
                 u.get("mobile") or "", u.get("created_at", "")] for u in users]
        return _csv_response(
            ["Name", "Email", "Role", "Plan", "Active", "Mobile", "Created"],
            rows, "civicsign_users.csv")
    except Exception as e:
        logger.error(f"[admin] export_users error: {e}")
        raise HTTPException(status_code=500, detail="Failed to export users")


@admin_router.get("/export/envelopes.csv")
@limiter.limit("5/minute")
async def export_envelopes(request: Request, admin: dict = Depends(require_admin)):
    """Disabled — envelope titles are not exported from the admin portal."""
    raise HTTPException(status_code=404, detail="Envelope export is disabled for privacy")


@admin_router.get("/export/contacts.csv")
@limiter.limit("5/minute")
async def export_contacts(request: Request, admin: dict = Depends(require_permission("contacts"))):
    """Export contact messages as CSV."""
    try:
        items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(20000)
        rows = [[c.get("name", ""), c.get("email", ""), c.get("subject", ""),
                 (c.get("message", "") or "").replace("\n", " "),
                 "yes" if c.get("handled") else "no", c.get("created_at", "")] for c in items]
        return _csv_response(
            ["Name", "Email", "Subject", "Message", "Handled", "Created"],
            rows, "civicsign_contacts.csv")
    except Exception as e:
        logger.error(f"[admin] export_contacts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to export contacts")


@admin_router.get("/users/organisation-options")
@limiter.limit("30/minute")
async def list_organisation_filter_options(
    request: Request,
    admin: dict = Depends(require_permission("users-read")),
):
    """Organisation names for the Users page nested filter (users-read staff can use this)."""
    orgs = await db.organizations.find(
        {}, {"_id": 0, "org_id": 1, "name": 1},
    ).sort("name", 1).to_list(500)
    return orgs


@admin_router.get("/users")
@limiter.limit("20/minute")
async def list_users(
    request: Request,
    q: str = Query("", description="Search by name or email"),
    role: str = Query("user", description="Filter by role: user | customer | staff | admin | internal | team | all"),
    plan: str = Query("", description="When role=user: free | pro | business | all"),
    org: str = Query("", description="When role=user: yes (in org pool) | no | all"),
    org_id: str = Query("", description="Filter to a specific organisation id"),
    org_role: str = Query("", description="When filtering organisations: owner | member | all"),
    admin: dict = Depends(require_permission("users-read")),
):
    """List users with optional search and role/plan filtering (SQL injection protected)."""
    try:
        role = (role or "").strip().lower()
        plan = (plan or "").strip().lower()
        org = (org or "").strip().lower()
        org_id = (org_id or "").strip()
        org_role = (org_role or "").strip().lower()
        q = _sanitize_string(q, max_length=100)
        query = _build_user_list_query(
            role=role, plan=plan, org=org, org_id=org_id, org_role=org_role, q=q,
        )
        
        users = await db.users.find(query, {"password_hash": 0, "_id": 0}).sort("created_at", -1).to_list(2000)

        # Document counts are super-admin only — staff must not see envelope volumes.
        if _is_super_admin(admin):
            agg = await db.envelopes.aggregate(
                [{"$group": {"_id": "$owner_id", "count": {"$sum": 1}}}]).to_list(20000)
            counts = {a["_id"]: a["count"] for a in agg}
            for u in users:
                u["envelope_count"] = counts.get(u["user_id"], 0)
        else:
            for u in users:
                u.pop("envelope_count", None)
        
        logger.info(f"[admin] list_users by {admin['email']} - returned {len(users)} results")
        return users
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] list_users error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list users")


@admin_router.patch("/users/{user_id}")
@limiter.limit("10/minute")
async def update_user(request: Request, user_id: str, body: AdminUserUpdate, admin: dict = Depends(require_admin)):
    """Update user account (plan, status, etc.) with signature verification."""
    try:
        # Validate user_id format
        if not isinstance(user_id, str) or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
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
        
        # SECURITY: Plan changes require payment verification signature
        if body.plan is not None:
            if body.plan not in PLANS:
                raise HTTPException(status_code=400, detail="Invalid plan")
            
            # Only allow plan downgrades or manual admin intervention (log it!)
            current_plan = target.get("plan", "free")
            if body.plan != current_plan:
                # If changing to a paid plan, require it to be via payment (has signature)
                if body.plan in ("pro", "business"):
                    # Check if user already has valid payment signature
                    if not target.get("plan_upgraded_via_payment"):
                        logger.warning(
                            f"[admin] Admin {admin['email']} attempted to upgrade user "
                            f"{user_id} to {body.plan} without payment - BLOCKED"
                        )
                        raise HTTPException(
                            status_code=403,
                            detail="Cannot upgrade to paid plan without payment. Use billing system instead."
                        )
                
                # For downgrade to free, require admin reason
                if body.plan == "free" and current_plan in ("pro", "business"):
                    logger.warning(
                        f"[admin] Admin {admin['email']} downgraded user {user_id} "
                        f"from {current_plan} to free"
                    )
                    await db.admin_audit.insert_one({
                        "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
                        "action": "plan_downgrade",
                        "admin_id": admin["user_id"],
                        "admin_email": admin["email"],
                        "target_user_id": user_id,
                        "target_email": target.get("email"),
                        "old_plan": current_plan,
                        "new_plan": body.plan,
                        "at": _now(),
                    })
                
                updates["plan"] = body.plan
                # Clear payment signature on plan change
                updates["plan_signature"] = None
                updates["plan_upgraded_via_payment"] = False
        
        if body.active is not None:
            updates["active"] = body.active

        if body.monthly_envelope_limit is not None:
            if body.monthly_envelope_limit <= 0:
                updates["monthly_envelope_limit"] = None
            else:
                updates["monthly_envelope_limit"] = body.monthly_envelope_limit
            updates["enterprise_unlimited"] = False

        if body.enterprise_unlimited is not None:
            if body.enterprise_unlimited and target.get("plan", "free") != "business":
                raise HTTPException(
                    status_code=400,
                    detail="Enterprise unlimited applies to Business plan accounts only",
                )
            updates["enterprise_unlimited"] = body.enterprise_unlimited
            if body.enterprise_unlimited:
                updates["monthly_envelope_limit"] = None

        if body.org_id is not None:
            oid = (body.org_id or "").strip()
            if not oid:
                updates["org_id"] = None
            else:
                org = await db.organizations.find_one({"org_id": oid}, {"org_id": 1})
                if not org:
                    raise HTTPException(status_code=404, detail="Organisation not found")
                updates["org_id"] = oid

        if not updates:
            raise HTTPException(status_code=400, detail="No changes provided")

        # Guard rail: an admin cannot deactivate their own account
        if user_id == admin["user_id"] and updates.get("active") is False:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

        updates["updated_at"] = _now()
        
        # Log plan changes in audit
        if "plan" in updates:
            await db.admin_audit.insert_one({
                "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
                "action": "plan_update",
                "admin_id": admin["user_id"],
                "admin_email": admin["email"],
                "target_user_id": user_id,
                "target_email": target.get("email"),
                "new_plan": updates.get("plan"),
                "at": _now(),
            })
        
        await db.users.update_one({"user_id": user_id}, {"$set": updates})
        fresh = await db.users.find_one({"user_id": user_id})
        return _clean_user(fresh)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] update_user error for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@admin_router.get("/users/{user_id}")
@limiter.limit("20/minute")
async def user_detail(request: Request, user_id: str, admin: dict = Depends(require_permission("users-read"))):
    """Full account detail + help/diagnostics for one user."""
    try:
        # Validate user_id format
        if not isinstance(user_id, str) or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        target = _clean_user(target)

        templates_count = await db.templates.count_documents({"owner_id": user_id})
        stats = {"templates": templates_count}

        if _is_super_admin(admin):
            envs = await db.envelopes.find(
                {"owner_id": user_id},
                {"_id": 0, "status": 1}).to_list(2000)
            status_counts = {s: 0 for s in STATUSES}
            for e in envs:
                status_counts[e.get("status", "draft")] = status_counts.get(e.get("status", "draft"), 0) + 1
            stats.update({
                "total": len(envs),
                "completed": status_counts.get("completed", 0),
                "sent": status_counts.get("sent", 0),
                "viewed": status_counts.get("viewed", 0),
                "draft": status_counts.get("draft", 0),
                "declined": status_counts.get("declined", 0),
                "expired": status_counts.get("expired", 0),
                "templates": templates_count,
            })

        from organizations import resolve_usage_quota, get_org_for_user

        raw_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        usage = await resolve_usage_quota(raw_user or target)
        org = await get_org_for_user(raw_user or target)

        email_ok = email_service.is_configured()
        diagnostics = {
            "email_configured": email_ok,
            "sender_email": os.environ.get("SENDER_EMAIL") or None,
            "account_active": target.get("active", True),
            "auth_provider": target.get("auth_provider", "password"),
            "can_send_email": email_ok,
            "email_note": (
                "Resend is configured — invites & notifications are emailed."
                if email_ok else
                "Resend is NOT configured. Recipients get shareable links instead of emails; "
                "set RESEND_API_KEY and SENDER_EMAIL to enable real delivery."),
        }

        return {
            "user": target,
            "usage": {
                "month": usage["month"],
                "used": usage["used"],
                "personal_used": usage.get("personal_used"),
                "limit": usage["limit"],
                "unlimited": usage["unlimited"],
                "fair_use": usage["fair_use"],
                "enterprise_unlimited": usage["enterprise_unlimited"],
                "contract_limit": usage.get("contract_limit"),
                "quota_note": usage["quota_note"],
                "scope": usage.get("scope", "user"),
                "organization": usage.get("organization"),
                "monthly_envelope_limit": raw_user.get("monthly_envelope_limit") if raw_user else None,
            },
            "organization": org,
            "stats": stats,
            "diagnostics": diagnostics,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] user_detail error for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user details")


@admin_router.post("/users/{user_id}/send-reset")
@limiter.limit("5/minute")
async def send_password_reset_link(request: Request, user_id: str, body: SendReset, admin: dict = Depends(require_admin)):
    """Generate a password-reset link for a user. Emails it via Resend when configured."""
    try:
        if not isinstance(user_id, str) or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        target = await db.users.find_one({"user_id": user_id})
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if not target.get("password_hash") and target.get("auth_provider") == "google":
            raise HTTPException(status_code=400, detail="This account signs in with Google and has no password to reset.")

        token = await create_password_reset(user_id)
        base = validate_redirect_base(body.base_url or "", fallback=request.headers.get("origin", ""))
        reset_link = f"{base}/reset-password?token={token}"
        status = email_service.send_password_reset(target["email"], target.get("name"), reset_link)
        
        await db.admin_audit.insert_one({
            "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
            "action": "send_password_reset",
            "admin_id": admin["user_id"],
            "admin_email": admin["email"],
            "target_user_id": user_id,
            "target_email": target["email"],
            "at": _now(),
        })
        logger.info(f"[admin] Password reset sent for {target['email']} by {admin['email']}")
        
        payload = {
            "emailed": status == "sent",
            "email_status": status,
            "email": target["email"],
        }
        if is_dev_mode():
            payload["reset_link"] = reset_link
            payload["dev_mode"] = True
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] send_password_reset_link error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset link")


@admin_router.post("/users/{user_id}/impersonate/request")
@limiter.limit("10/minute")
async def impersonate_request(request: Request, user_id: str,
                              admin: dict = Depends(require_permission("impersonate"))):
    """Step 1 of impersonation: email a one-time OTP to the USER. The user must
    read the code back to the support member — account access requires the
    user's consent. (On-screen fallback only when email delivery is off.)"""
    try:
        if not isinstance(user_id, str) or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        target = await db.users.find_one({"user_id": user_id})
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target.get("role") in ("admin", "staff"):
            raise HTTPException(status_code=400, detail="Internal team accounts cannot be impersonated.")
        if target.get("active") is False:
            raise HTTPException(status_code=400, detail="Reactivate this account before entering it.")

        request_id = f"imp_{uuid.uuid4().hex[:16]}"
        otp = f"{secrets.randbelow(900000) + 100000}"
        
        expire_dt = datetime.now(timezone.utc) + timedelta(minutes=5)
        await db.impersonation_otps.insert_one({
            "request_id": request_id,
            "admin_id": admin["user_id"],
            "target_user_id": user_id,
            "otp_hash": _impersonation_otp_hash(otp),
            "used": False,
            "expires_at": expire_dt.isoformat(),
            # Real BSON date for the TTL index (auto-purges stale OTPs).
            "expire_at": expire_dt,
            "created_at": _now(),
        })
        
        logger.warning(
            f"[admin] Impersonation OTP requested by {admin['email']} for {target['email']} "
            f"(request_id={request_id})"
        )
        
        # SECURITY: the OTP is emailed to the USER (consent gate) — staff must
        # ask the user for the code. It is never emailed or shown to staff
        # unless email delivery is unconfigured (local dev fallback).
        dev_mode = is_dev_mode()
        if not dev_mode:
            email_service.send_impersonation_otp(
                target["email"], target.get("name"), otp, admin["email"])
        elif not email_service.is_configured():
            logger.warning("[admin] DEV_MODE on but email not configured — OTP shown in API response")
        return {
            "request_id": request_id,
            "otp": otp if dev_mode else None,
            "dev_mode": dev_mode,
            "expires_in": 300,
            "target_email": target["email"],
            "message": ("Code shown below (email delivery is off in this environment)."
                        if dev_mode else
                        f"A 6-digit code was emailed to {target['email']}. Ask the user to read it to you."),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] impersonate_request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create impersonation request")


@admin_router.post("/users/{user_id}/impersonate/verify")
@limiter.limit("5/minute")
async def impersonate_verify(request: Request, user_id: str, body: ImpersonateVerify,
                             admin: dict = Depends(require_permission("impersonate"))):
    """Step 2: verify the OTP and mint an access token for the target user."""
    try:
        if not isinstance(user_id, str) or len(user_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        rec = await db.impersonation_otps.find_one({
            "request_id": body.request_id,
            "admin_id": admin["user_id"],
            "target_user_id": user_id
        })
        
        if not rec or rec.get("used"):
            logger.warning(
                f"[admin] Impersonation verification failed for {user_id} - "
                f"invalid or already-used code by {admin['email']}"
            )
            raise HTTPException(status_code=400, detail="Invalid or already-used verification code")

        if int(rec.get("failed_attempts") or 0) >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. Request a new verification code.",
            )
        
        try:
            expired = datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc)
        except Exception:
            expired = True
        
        if expired:
            raise HTTPException(status_code=400, detail="This verification code has expired. Please request a new one.")
        
        # Strict OTP comparison (prevent timing attacks); support legacy plaintext records
        stored_hash = rec.get("otp_hash")
        if stored_hash:
            otp_ok = hmac.compare_digest(_impersonation_otp_hash(body.otp or ""), stored_hash)
        else:
            otp_ok = hmac.compare_digest((body.otp or "").strip(), rec.get("otp") or "")
        if not otp_ok:
            await db.impersonation_otps.update_one(
                {"request_id": body.request_id},
                {"$inc": {"failed_attempts": 1}}
            )
            logger.warning(
                f"[admin] Impersonation OTP mismatch for {user_id} by {admin['email']}"
            )
            raise HTTPException(status_code=400, detail="Incorrect verification code")

        await db.impersonation_otps.update_one({"request_id": body.request_id}, {"$set": {"used": True}})

        target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="User not found")

        token = create_access_token(
            target["user_id"],
            target["email"],
            token_version=int(target.get("token_version") or 0),
            impersonating=True,
        )
        
        await db.admin_audit.insert_one({
            "audit_id": f"aud_{uuid.uuid4().hex[:12]}",
            "action": "impersonate",
            "admin_id": admin["user_id"],
            "admin_email": admin["email"],
            "target_user_id": user_id,
            "target_email": target["email"],
            "at": _now(),
        })
        
        logger.warning(
            f"[admin] IMPERSONATION GRANTED: {admin['email']} -> {target['email']}"
        )
        
        return {"access_token": token, "user": _public_user(target)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] impersonate_verify error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify impersonation code")


@admin_router.get("/envelopes")
@limiter.limit("20/minute")
async def list_all_envelopes(
    request: Request,
    admin: dict = Depends(require_admin),
):
    """Envelope browsing disabled — document titles and metadata are private to account owners."""
    raise HTTPException(status_code=404, detail="Envelope browsing is disabled for privacy")


@admin_router.get("/contact-messages")
@limiter.limit("20/minute")
async def list_contacts(request: Request, admin: dict = Depends(require_permission("contacts"))):
    """List contact form submissions."""
    try:
        items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
        logger.info(f"[admin] list_contacts by {admin['email']} - returned {len(items)} results")
        return items
    except Exception as e:
        logger.error(f"[admin] list_contacts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list contacts")


@admin_router.patch("/contact-messages/{contact_id}")
@limiter.limit("10/minute")
async def handle_contact(request: Request, contact_id: str, body: ContactHandle, admin: dict = Depends(require_permission("contacts"))):
    """Mark contact as handled."""
    try:
        if not isinstance(contact_id, str) or len(contact_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid contact ID")
        
        res = await db.contact_messages.update_one(
            {"contact_id": contact_id},
            {"$set": {"handled": body.handled, "handled_by": admin["email"], "handled_at": _now()}}
        )
        
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        
        logger.info(f"[admin] Contact {contact_id} marked as handled by {admin['email']}")
        return {"ok": True, "handled": body.handled}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] handle_contact error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update contact")


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
@limiter.limit("20/minute")
async def list_transactions(
    request: Request,
    q: str = Query("", description="Search by email or session id"),
    status: str = Query("all", description="all | paid | pending | refunded | failed"),
    admin: dict = Depends(require_permission("billing")),
):
    """All Stripe payment attempts, newest first, with user info."""
    try:
        query: dict = {}
        
        # Validate status parameter
        valid_statuses = ["all", "paid", "pending", "refunded", "failed"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        
        if status == "paid":
            query = {"payment_status": "paid", "refund_status": {"$in": [None, "none"]}}
        elif status == "pending":
            query = {"payment_status": "pending"}
        elif status == "refunded":
            query = {"refund_status": {"$in": ["refunded", "partial"]}}
        elif status == "failed":
            query = {"payment_status": {"$in": ["failed", "canceled", "expired"]}}

        # SECURITY: Sanitize search query
        q = _sanitize_string(q, max_length=100)
        if q:
            try:
                escaped_q = re.escape(q)
                search_query = {"$or": [
                    {"email": {"$regex": escaped_q, "$options": "i"}},
                    {"session_id": {"$regex": escaped_q, "$options": "i"}},
                    {"tx_id": {"$regex": escaped_q, "$options": "i"}}
                ]}
                query = {"$and": [query, search_query]} if query else search_query
            except Exception as e:
                logger.warning(f"[admin] transaction search error: {e}")
                raise HTTPException(status_code=400, detail="Invalid search query")

        txs = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
        user_ids = list({t.get("user_id") for t in txs if t.get("user_id")})
        users = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1, "plan": 1},
        ).to_list(5000) if user_ids else []
        users_map = {u["user_id"]: u for u in users}
        
        logger.info(f"[admin] list_transactions by {admin['email']} - returned {len(txs)} results")
        return [_enrich_tx(t, users_map) for t in txs]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] list_transactions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list transactions")


@admin_router.get("/billing/metrics")
@limiter.limit("10/minute")
async def billing_metrics(request: Request, admin: dict = Depends(require_permission("billing"))):
    """Revenue KPIs: gross, refunded, net, by plan, last-30-day daily series."""
    try:
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
    except Exception as e:
        logger.error(f"[admin] billing_metrics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve billing metrics")


@admin_router.post("/transactions/{tx_id}/refund")
@limiter.limit("5/minute")
async def refund_transaction(request: Request, tx_id: str, body: RefundRequest, admin: dict = Depends(require_admin)):
    """
    Issue a Stripe refund for a paid transaction.

    - Full refund when `amount` is omitted; otherwise partial refund.
    - Optionally downgrades the user's plan back to `free`.
    - Records a refund event on the transaction and in `admin_audit`.
    """
    try:
        if not isinstance(tx_id, str) or len(tx_id) > 50:
            raise HTTPException(status_code=400, detail="Invalid transaction ID")
        
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
            "reason_note": _sanitize_string(body.reason or "", max_length=480),
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
        now = _now()
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

        # Plan refunds downgrade immediately — do not wait for billing period end.
        plan_changed = False
        if body.downgrade_plan and tx.get("user_id") and _is_plan_purchase_tx(tx):
            plan_changed = await downgrade_user_for_plan_refund(
                tx["user_id"],
                reason=f"admin refund tx={tx_id}",
            )

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

        logger.warning(
            f"[admin] Refund processed by {admin['email']}: tx_id={tx_id}, "
            f"amount={refund_amount}, user={tx.get('user_id')}"
        )

        fresh = await db.payment_transactions.find_one({"tx_id": tx_id}, {"_id": 0})
        return {
            "ok": True,
            "refund_status": new_status,
            "refund_amount": new_total_refunded,
            "plan_downgraded": plan_changed,
            "transaction": fresh,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] refund_transaction error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process refund")


@admin_router.get("/audit-log")
@limiter.limit("20/minute")
async def admin_audit_log(
    request: Request,
    limit: int = Query(200, ge=1, le=2000),
    action: str = Query("all"),
    admin: dict = Depends(require_permission("audit")),
):
    """Recent admin actions (impersonate, password resets, refunds)."""
    try:
        query: dict = {}
        if action != "all":
            query["action"] = action
        
        items = await db.admin_audit.find(query, {"_id": 0}).sort("at", -1).to_list(limit)
        logger.info(f"[admin] audit_log accessed by {admin['email']} - returned {len(items)} results")
        return items
    except Exception as e:
        logger.error(f"[admin] admin_audit_log error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit log")
