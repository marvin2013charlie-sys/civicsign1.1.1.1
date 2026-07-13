#!/usr/bin/env python3
"""Wipe local CivicSign data and seed one login per tier (dev only).

Deletes all users, organisations, envelopes, templates, signatures, GridFS
files, and related records — then creates dev test accounts (free, pro, business, org owner, org staff, admin):

  free, pro, business, organisation owner, internal admin

Run from project root:
  backend/.venv/bin/python scripts/reset_dev_data.py
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / "backend" / ".env")

from auth import hash_password  # noqa: E402
from plan_signing import generate_plan_signature  # noqa: E402

def _assert_safe_to_wipe() -> None:
    mongo_url = os.environ.get("MONGO_URL", "").lower()
    if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
        print("ERROR: Refusing to wipe Atlas or other remote MongoDB.")
        print("       This script is for local development only.")
        sys.exit(1)
    is_local = "127.0.0.1" in mongo_url or "localhost" in mongo_url
    if not is_local and os.environ.get("CONFIRM_DEV_WIPE") != "yes":
        print("ERROR: Non-local MONGO_URL requires CONFIRM_DEV_WIPE=yes")
        sys.exit(1)


_assert_safe_to_wipe()

client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=8000)
db = client[os.environ["DB_NAME"]]

# Collections wiped on reset (keeps blog, careers, contact inbox if any)
WIPE_COLLECTIONS = [
    "users",
    "organizations",
    "envelopes",
    "templates",
    "contacts",
    "signer_signatures",
    "teams",
    "comments",
    "team_invites",
    "org_invites",
    "payment_transactions",
    "usage_ledger",
    "org_usage_ledger",
    "pdf_workspaces",
    "impersonation_otps",
    "email_verifications",
    "password_resets",
    "login_attempts",
]

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


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _wipe_gridfs() -> int:
    files = await db["fs.files"].count_documents({})
    await db["fs.chunks"].delete_many({})
    await db["fs.files"].delete_many({})
    return files


async def _wipe_collections() -> dict[str, int]:
    counts = {}
    for name in WIPE_COLLECTIONS:
        result = await db[name].delete_many({})
        counts[name] = result.deleted_count
    return counts


async def _seed_user(spec: dict, *, created_by: str | None = None) -> dict:
    user_id = f"user_{uuid.uuid4().hex[:16]}"
    ts = _now()
    plan = spec["plan"]
    doc = {
        "user_id": user_id,
        "email": spec["email"].lower().strip(),
        "name": spec["name"],
        "password_hash": hash_password(spec["password"]),
        "picture": None,
        "mobile": None,
        "auth_provider": "password",
        "role": spec["role"],
        "plan": plan,
        "active": True,
        "email_verified": True,
        "created_at": ts,
        "extra_document_credits": 0,
    }
    if spec.get("org_id"):
        doc["org_id"] = spec["org_id"]
        doc["org_role"] = spec.get("org_role", "owner")
        doc["company"] = spec.get("company", ORG_NAME)
    if created_by:
        doc["created_by"] = created_by
    if plan in ("pro", "business"):
        doc["plan_updated_at"] = ts
        doc["plan_signature"] = generate_plan_signature(user_id, plan, ts)
        doc["plan_upgraded_via_payment"] = True
    await db.users.insert_one(doc)
    return doc


async def _seed_organisation(owner: dict, admin_id: str) -> dict:
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
    await db.organizations.insert_one(org)
    return org


async def main() -> None:
    print("==> CivicSign dev data reset")
    print(f"    Database: {db.name}")

    grid_deleted = await _wipe_gridfs()
    print(f"    GridFS files removed: {grid_deleted}")

    counts = await _wipe_collections()
    total = sum(counts.values())
    print(f"    Collection documents removed: {total}")
    for name, n in counts.items():
        if n:
            print(f"      - {name}: {n}")

    admin = await _seed_user(ACCOUNTS["admin"])
    free = await _seed_user(ACCOUNTS["free"])
    pro = await _seed_user(ACCOUNTS["pro"])
    business = await _seed_user(ACCOUNTS["business"])
    org_owner = await _seed_user(ACCOUNTS["organisation"], created_by=admin["user_id"])
    org_staff = await _seed_user(ACCOUNTS["org_staff"], created_by=org_owner["user_id"])
    org = await _seed_organisation(org_owner, admin["user_id"])

    print("\n==> Seeded accounts (local dev only)")
    print(f"    FREE         {free['email']}  /  {ACCOUNTS['free']['password']}")
    print(f"    PRO          {pro['email']}  /  {ACCOUNTS['pro']['password']}")
    print(f"    BUSINESS     {business['email']}  /  {ACCOUNTS['business']['password']}")
    print(f"    ORG OWNER    {org_owner['email']}  /  {ACCOUNTS['organisation']['password']}")
    print(f"    ORG STAFF    {org_staff['email']}  /  {ACCOUNTS['org_staff']['password']}")
    print(f"                 Org: {org['name']} ({org['org_id']})")
    print(f"    ADMIN        {admin['email']}  /  {ACCOUNTS['admin']['password']}")
    print("                 Login: http://localhost:3000/admin/login")
    print("\n    Regular users: http://localhost:3000/login")
    print("    Org portal:    http://localhost:3000/organisation")
    print("\nDone.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())