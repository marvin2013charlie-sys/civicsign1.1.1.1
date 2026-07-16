"""Pilot / demo accounts for QA and private beta — upsert only, never wipes data."""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone

from auth import hash_password
from plan_signing import generate_plan_signature
from security_utils import is_dev_mode

ORG_NAME = "CivicSign Demo Organisation"
ORG_ID = "org_civicsign_demo01"

PILOT_EMAILS = {spec["email"].lower() for spec in (
    {"email": "free@civicbot.co.uk"},
    {"email": "pro@civicbot.co.uk"},
    {"email": "business@civicbot.co.uk"},
    {"email": "org@civicbot.co.uk"},
    {"email": "staff@civicbot.co.uk"},
)}

PILOT_TEST_NAMES = {
    "Free Test User",
    "Pro Test User",
    "Business Test User",
    "Organisation Owner",
    "Organisation Staff",
    "CivicSign Demo",
    "Prod Test",
    "Smoke Tester",
    "Integration Check",
}

_TEST_EMAIL_PATTERNS = (
    re.compile(r"^smoke_[^@]+@civicbot\.co\.uk$", re.I),
    re.compile(r"^prodtest_[^@]+@civicbot\.co\.uk$", re.I),
    re.compile(r"^checkout-test-[^@]+@civicbot\.co\.uk$", re.I),
    re.compile(r"^integration-check-[^@]+@example\.com$", re.I),
)

PILOT_ACCOUNT_SPECS = {
    "free": {
        "email": "free@civicbot.co.uk",
        "name": "Free Test User",
        "plan": "free",
        "role": "user",
    },
    "pro": {
        "email": "pro@civicbot.co.uk",
        "name": "Pro Test User",
        "plan": "pro",
        "role": "user",
    },
    "business": {
        "email": "business@civicbot.co.uk",
        "name": "Business Test User",
        "plan": "business",
        "role": "user",
    },
    "organisation": {
        "email": "org@civicbot.co.uk",
        "name": "Organisation Owner",
        "plan": "business",
        "role": "user",
        "org_id": ORG_ID,
        "org_role": "owner",
        "company": ORG_NAME,
    },
    "org_staff": {
        "email": "staff@civicbot.co.uk",
        "name": "Organisation Staff",
        "plan": "business",
        "role": "user",
        "org_id": ORG_ID,
        "org_role": "member",
        "company": ORG_NAME,
    },
    "admin": {
        "email": "admin@civicbot.co.uk",
        "name": "CivicSign Admin",
        "plan": "business",
        "role": "admin",
    },
}


def _pilot_password(slot: str) -> str:
    """Resolve pilot password from env — never hardcoded in source."""
    env_key = f"PILOT_PASSWORD_{slot.upper()}"
    value = (os.environ.get(env_key) or "").strip()
    if value:
        return value
    if is_dev_mode():
        shared = (os.environ.get("PILOT_PASSWORD_DEV") or "").strip()
        if shared:
            return shared
    raise RuntimeError(
        f"Missing {env_key} (or PILOT_PASSWORD_DEV in DEV_MODE) — "
        "set passwords in backend/.env or run scripts/reset_dev_data.py",
    )


def pilot_account(slot: str) -> dict:
    spec = dict(PILOT_ACCOUNT_SPECS[slot])
    spec["password"] = _pilot_password(slot)
    return spec


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def upsert_pilot_user(db, spec: dict, *, created_by: str | None = None) -> dict:
    email = spec["email"].lower().strip()
    existing = await db.users.find_one({"email": email})
    ts = _now()
    plan = spec["plan"]
    base = {
        "email": email,
        "name": spec["name"],
        "password_hash": hash_password(spec["password"]),
        "auth_provider": "password",
        "role": spec["role"],
        "plan": plan,
        "active": True,
        "email_verified": True,
    }
    if spec.get("org_id"):
        base["org_id"] = spec["org_id"]
        base["org_role"] = spec.get("org_role", "owner")
        base["company"] = spec.get("company", ORG_NAME)
    user_id = existing["user_id"] if existing else f"user_{uuid.uuid4().hex[:16]}"
    if plan in ("pro", "business"):
        base["plan_updated_at"] = ts
        base["plan_signature"] = generate_plan_signature(user_id, plan, ts)
        base["plan_upgraded_via_payment"] = True

    if existing:
        await db.users.update_one({"user_id": user_id}, {"$set": base})
        return {**existing, **base}
    doc = {
        "user_id": user_id,
        "picture": None,
        "mobile": None,
        "extra_document_credits": 0,
        "created_at": ts,
        **base,
    }
    if created_by:
        doc["created_by"] = created_by
    await db.users.insert_one(doc)
    return doc


async def upsert_pilot_organisation(db, owner: dict, admin_id: str) -> dict:
    org = {
        "org_id": ORG_ID,
        "name": ORG_NAME,
        "monthly_envelope_limit": None,
        "enterprise_unlimited": False,
        "owner_user_id": owner["user_id"],
        "contact_email": owner["email"],
        "per_seat_limit": 500,
        "created_at": _now(),
        "created_by": admin_id,
    }
    existing = await db.organizations.find_one({"org_id": ORG_ID})
    if existing:
        await db.organizations.update_one({"org_id": ORG_ID}, {"$set": org})
    else:
        await db.organizations.insert_one(org)
    return org


async def seed_pilot_accounts(db) -> None:
    """Create or refresh standard pilot logins (idempotent)."""
    admin = await upsert_pilot_user(db, pilot_account("admin"))
    await upsert_pilot_user(db, pilot_account("free"))
    await upsert_pilot_user(db, pilot_account("pro"))
    await upsert_pilot_user(db, pilot_account("business"))
    org_owner = await upsert_pilot_user(db, pilot_account("organisation"), created_by=admin["user_id"])
    await upsert_pilot_user(db, pilot_account("org_staff"), created_by=org_owner["user_id"])
    await upsert_pilot_organisation(db, org_owner, admin["user_id"])


def is_test_account(user: dict, *, demo_email: str = "") -> bool:
    """True for pilot/demo/smoke accounts — never real paying customers."""
    email = (user.get("email") or "").lower().strip()
    if not email:
        return False
    if email == "admin@civicbot.co.uk":
        return False
    if email in PILOT_EMAILS:
        return True
    if demo_email and email == demo_email.lower().strip():
        return True
    name = (user.get("name") or "").strip()
    if name in PILOT_TEST_NAMES:
        return True
    return any(pat.match(email) for pat in _TEST_EMAIL_PATTERNS)


async def delete_pilot_organisation(db) -> None:
    await db.organizations.delete_one({"org_id": ORG_ID})
    await db.org_invites.delete_many({"org_id": ORG_ID})
    await db.org_usage_ledger.delete_many({"org_id": ORG_ID})


async def cleanup_test_accounts(db, *, demo_email: str = "") -> dict:
    """Remove pilot/demo/smoke users and the demo organisation."""
    from auth import purge_user_data

    deleted = []
    kept = []
    cursor = db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1})
    async for user in cursor:
        if user.get("role") == "admin":
            kept.append(user.get("email"))
            continue
        if not is_test_account(user, demo_email=demo_email):
            kept.append(user.get("email"))
            continue
        await purge_user_data(db, user["user_id"])
        await db.users.delete_one({"user_id": user["user_id"]})
        deleted.append(user.get("email"))

    await delete_pilot_organisation(db)
    return {"deleted": deleted, "deleted_count": len(deleted), "kept_sample": kept[:5]}


def is_free_test_account(user: dict) -> bool:
    """True when the stored plan is free (includes stale demo-org memberships)."""
    if user.get("role") == "admin":
        return False
    stored = (user.get("plan") or "free").lower().strip()
    if stored == "free":
        return True
    if user.get("org_id") == ORG_ID:
        return True
    return False


async def cleanup_free_accounts(db) -> dict:
    """Remove every non-admin account on the free plan (private-beta test signups)."""
    from auth import purge_user_data

    deleted = []
    kept = []
    cursor = db.users.find(
        {},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1, "plan": 1, "org_id": 1},
    )
    async for user in cursor:
        if not is_free_test_account(user):
            kept.append(user.get("email"))
            continue
        await purge_user_data(db, user["user_id"])
        await db.users.delete_one({"user_id": user["user_id"]})
        deleted.append(user.get("email"))

    return {"deleted": deleted, "deleted_count": len(deleted), "kept": kept}


MAIN_ADMIN_EMAIL = "admin@civicbot.co.uk"


async def cleanup_extra_team(db, *, keep_email: str = MAIN_ADMIN_EMAIL) -> dict:
    """Delete every staff/extra-admin account except the one main admin email."""
    from auth import purge_user_data

    keep = (keep_email or MAIN_ADMIN_EMAIL).lower().strip()
    deleted = []
    cursor = db.users.find(
        {"role": {"$in": ["admin", "staff"]}},
        {"_id": 0, "user_id": 1, "email": 1, "role": 1},
    )
    async for user in cursor:
        email = (user.get("email") or "").lower().strip()
        if email == keep:
            continue
        await purge_user_data(db, user["user_id"])
        await db.users.delete_one({"user_id": user["user_id"]})
        deleted.append(user.get("email"))
    return {"deleted": deleted, "deleted_count": len(deleted), "kept": keep}