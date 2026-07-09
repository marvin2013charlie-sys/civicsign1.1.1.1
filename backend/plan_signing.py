"""Plan tier resolution and HMAC signatures (shared by auth, billing, organisations).

Kept separate from billing.py to avoid circular imports with auth.py.
"""
import hashlib
import hmac
import os


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


def get_effective_plan(user: dict) -> str:
    """Return the user's plan after verifying payment signature (anti-tamper)."""
    if is_internal_team(user):
        return "business"
    if is_organisation_member(user):
        return "business"
    plan = user.get("plan", "free")
    if plan == "free":
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