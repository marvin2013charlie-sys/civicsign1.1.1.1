#!/usr/bin/env python3
"""Upsert pilot/test accounts (free, pro, business, org, admin) without wiping data.

Safe for production Atlas when run deliberately:
  CONFIRM_REMOTE_SEED=yes MONGO_URL='mongodb+srv://...' \\
    backend/.venv/bin/python scripts/seed_pilot_accounts.py

Local:
  backend/.venv/bin/python scripts/seed_pilot_accounts.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / "backend" / ".env")

from auth import hash_password  # noqa: E402
from plan_signing import generate_plan_signature  # noqa: E402

ORG_NAME = "CivicSign Demo Organisation"
ORG_ID = "org_civicsign_demo01"

ACCOUNTS = {
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


def _assert_safe() -> None:
    mongo_url = os.environ.get("MONGO_URL", "").lower()
    if not mongo_url:
        print("ERROR: MONGO_URL is not set")
        sys.exit(1)
    is_remote = "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url
    if is_remote and os.environ.get("CONFIRM_REMOTE_SEED") != "yes":
        print("ERROR: Remote MongoDB detected. Set CONFIRM_REMOTE_SEED=yes to upsert pilot accounts.")
        sys.exit(1)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _upsert_user(db, spec: dict, *, created_by: str | None = None) -> dict:
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
    if plan in ("pro", "business"):
        base["plan_updated_at"] = ts
        base["plan_signature"] = generate_plan_signature(
            existing["user_id"] if existing else f"user_{uuid.uuid4().hex[:16]}",
            plan,
            ts,
        )
        base["plan_upgraded_via_payment"] = True

    if existing:
        user_id = existing["user_id"]
        if plan in ("pro", "business"):
            base["plan_signature"] = generate_plan_signature(user_id, plan, ts)
        await db.users.update_one({"user_id": user_id}, {"$set": base})
        doc = {**existing, **base}
    else:
        user_id = f"user_{uuid.uuid4().hex[:16]}"
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
        if plan in ("pro", "business"):
            doc["plan_signature"] = generate_plan_signature(user_id, plan, ts)
        await db.users.insert_one(doc)
    return doc


async def _upsert_organisation(db, owner: dict, admin_id: str) -> dict:
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


async def main() -> None:
    _assert_safe()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=15000)
    db = client[os.environ.get("DB_NAME", "civicsign")]

    print("==> Upserting pilot accounts (no wipe)")
    print(f"    Database: {db.name}")

    admin = await _upsert_user(db, ACCOUNTS["admin"])
    await _upsert_user(db, ACCOUNTS["free"])
    pro = await _upsert_user(db, ACCOUNTS["pro"])
    business = await _upsert_user(db, ACCOUNTS["business"])
    org_owner = await _upsert_user(db, ACCOUNTS["organisation"], created_by=admin["user_id"])
    org_staff = await _upsert_user(db, ACCOUNTS["org_staff"], created_by=org_owner["user_id"])
    org = await _upsert_organisation(db, org_owner, admin["user_id"])

    print("\n==> Accounts ready")
    print(f"    FREE         {ACCOUNTS['free']['email']}  /  {ACCOUNTS['free']['password']}")
    print(f"    PRO          {ACCOUNTS['pro']['email']}  /  {ACCOUNTS['pro']['password']}")
    print(f"    BUSINESS     {ACCOUNTS['business']['email']}  /  {ACCOUNTS['business']['password']}")
    print(f"    ORG OWNER    {ACCOUNTS['organisation']['email']}  /  {ACCOUNTS['organisation']['password']}")
    print(f"    ORG STAFF    {ACCOUNTS['org_staff']['email']}  /  {ACCOUNTS['org_staff']['password']}")
    print(f"                 Org ID: {org['org_id']}")
    print(f"                 Org name: {org['name']}")
    print(f"    ADMIN        {ACCOUNTS['admin']['email']}  /  {ACCOUNTS['admin']['password']}")
    print("\n    User login:  https://civicsign.co.uk/login")
    print("    Admin login: https://civicsign.co.uk/admin/login")
    print("    Org portal:  https://civicsign.co.uk/organisation")
    print("\nDone.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())