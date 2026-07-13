"""Pilot / demo accounts for QA and private beta — upsert only, never wipes data."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from auth import hash_password
from plan_signing import generate_plan_signature

ORG_NAME = "CivicSign Demo Organisation"
ORG_ID = "org_civicsign_demo01"

PILOT_ACCOUNTS = {
    "free": {
        "email": "free@civicbot.co.uk",
        "password": "CivicSign2026!Free",
        "name": "Free Test User",
        "plan": "free",
        "role": "user",
    },
    "pro": {
        "email": "pro@civicbot.co.uk",
        "password": "CivicSign2026!Pro",
        "name": "Pro Test User",
        "plan": "pro",
        "role": "user",
    },
    "business": {
        "email": "business@civicbot.co.uk",
        "password": "CivicSign2026!Biz",
        "name": "Business Test User",
        "plan": "business",
        "role": "user",
    },
    "organisation": {
        "email": "org@civicbot.co.uk",
        "password": "CivicSign2026!Org",
        "name": "Organisation Owner",
        "plan": "business",
        "role": "user",
        "org_id": ORG_ID,
        "org_role": "owner",
        "company": ORG_NAME,
    },
    "org_staff": {
        "email": "staff@civicbot.co.uk",
        "password": "CivicSign2026!Staff",
        "name": "Organisation Staff",
        "plan": "business",
        "role": "user",
        "org_id": ORG_ID,
        "org_role": "member",
        "company": ORG_NAME,
    },
    "admin": {
        "email": "admin@civicbot.co.uk",
        "password": "CivicSign2026!Admin",
        "name": "CivicSign Admin",
        "plan": "business",
        "role": "admin",
    },
}


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
    admin = await upsert_pilot_user(db, PILOT_ACCOUNTS["admin"])
    await upsert_pilot_user(db, PILOT_ACCOUNTS["free"])
    await upsert_pilot_user(db, PILOT_ACCOUNTS["pro"])
    await upsert_pilot_user(db, PILOT_ACCOUNTS["business"])
    org_owner = await upsert_pilot_user(db, PILOT_ACCOUNTS["organisation"], created_by=admin["user_id"])
    await upsert_pilot_user(db, PILOT_ACCOUNTS["org_staff"], created_by=org_owner["user_id"])
    await upsert_pilot_organisation(db, org_owner, admin["user_id"])