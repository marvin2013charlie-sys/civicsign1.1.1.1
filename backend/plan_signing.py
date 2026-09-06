"""Plan tier resolution and HMAC signatures (shared by auth, billing, organisations).

Kept separate from billing.py to avoid circular imports with auth.py.
"""
import hashlib
import hmac
import os
from datetime import datetime, timezone

# Stripe statuses that keep paid access until period end (or renewal).
_ACTIVE_SUB_STATUSES = frozenset({"active", "trialing"})
# Terminal or unpaid statuses revoke paid access immediately.
_DEAD_SUB_STATUSES = frozenset({
    "canceled", "unpaid", "past_due", "incomplete", "incomplete_expired", "paused",
})


def get_plan_secret() -> str:
    secret = os.environ.get("PLAN_ENCRYPTION_SECRET")
    if not secret:
        raise RuntimeError("PLAN_ENCRYPTION_SECRET environment variable is not set")
    return secret


def generate_plan_signature(user_id: str, plan_id: str, timestamp: str) -> str:
    """Generate HMAC signature for plan verification."""
    message = f"{user_id}:{plan_id}:{timestamp}".encode("utf-8")
    return hmac.new(
        get_plan_secret().encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()


def verify_plan_signature(user_id: str, plan_id: str, timestamp: str, signature: str) -> bool:
    expected = generate_plan_signature(user_id, plan_id, timestamp)
    return hmac.compare_digest(expected, signature)


def is_organisation_member(user: dict) -> bool:
    org_id = user.get("org_id")
    return bool(org_id and str(org_id).strip())


def is_internal_team(user: dict) -> bool:
    """CivicSign admin/staff accounts — full product access for demos and support."""
    return user.get("role") in ("admin", "staff")


def _parse_iso_utc(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def period_end_passed(user: dict) -> bool:
    """True when subscription_current_period_end is set and is in the past."""
    end = _parse_iso_utc(user.get("subscription_current_period_end"))
    if end is None:
        return False
    return datetime.now(timezone.utc) >= end


def admin_plan_grant_expired(user: dict) -> bool:
    """True when an admin-granted paid plan is past its period end."""
    if not user.get("admin_plan_grant"):
        return False
    return period_end_passed(user)


def paid_access_should_expire(user: dict) -> bool:
    """Whether a stored paid plan should no longer grant Pro/Business features.

    Cases:
    - Admin grant past period end
    - Cancel-at-period-end and period has ended (user did not upgrade/renew)
    - Subscription status is dead (canceled / unpaid / past_due / incomplete*)
    - Paid period ended, even if a missed webhook left status active/trialing
    - Stripe subscription has no usable period end (must be reconciled first)
    """
    plan = (user.get("plan") or "free").lower().strip()
    if plan not in ("pro", "business"):
        return False
    if is_internal_team(user) or is_organisation_member(user):
        return False

    if admin_plan_grant_expired(user):
        return True

    status = (user.get("subscription_status") or "").lower().strip()
    if status in _DEAD_SUB_STATUSES:
        return True

    if period_end_passed(user):
        return True

    if (user.get("plan_upgraded_via_payment") or user.get("admin_plan_grant")) and (
        _parse_iso_utc(user.get("subscription_current_period_end")) is None
    ):
        return True
    if user.get("stripe_subscription_id"):
        return (
            status not in _ACTIVE_SUB_STATUSES
            or _parse_iso_utc(user.get("subscription_current_period_end")) is None
        )
    return False


def should_persist_plan_downgrade(user: dict) -> bool:
    """True when DB still says pro/business but effective access is free."""
    plan = (user.get("plan") or "free").lower().strip()
    if plan not in ("pro", "business"):
        return False
    if is_internal_team(user) or is_organisation_member(user):
        return False
    return get_effective_plan(user) == "free"


def get_effective_plan(user: dict) -> str:
    """Return the user's plan after verifying payment signature (anti-tamper).

    Also enforces the paid/trial deadline, including when a webhook is missing.
    Expired accounts are Free until renewal is verified; request-time and
    background reconciliation persist the corresponding database state.
    """
    if is_internal_team(user):
        return "business"
    if is_organisation_member(user):
        return "business"
    plan = (user.get("plan") or "free").lower().strip()
    if plan == "free":
        return "free"
    if paid_access_should_expire(user):
        return "free"
    if admin_plan_grant_expired(user):
        return "free"
    sig = user.get("plan_signature")
    ts = user.get("plan_updated_at")
    if not sig or not ts:
        return "free"
    if not verify_plan_signature(user["user_id"], plan, ts, sig):
        return "free"
    return plan


# Back-compat aliases used across the codebase
_generate_plan_signature = generate_plan_signature
_verify_plan_signature = verify_plan_signature
