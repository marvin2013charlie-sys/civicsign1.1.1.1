#!/usr/bin/env python3
"""Remove pilot/demo/smoke test users from MongoDB (production-safe).

Deletes @civicbot.co.uk pilots (except admin), CivicSign Demo, smoke/prodtest
accounts, and the demo organisation. Real free-plan customers are kept.

Usage:
  CONFIRM_PROD_CLEANUP=yes MONGO_URL='mongodb+srv://...' \\
    backend/.venv/bin/python scripts/cleanup_test_accounts.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / "backend" / ".env")

from pilot_accounts import cleanup_test_accounts  # noqa: E402


def _assert_confirmed() -> None:
    mongo_url = os.environ.get("MONGO_URL", "").lower()
    is_remote = "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url
    if is_remote and os.environ.get("CONFIRM_PROD_CLEANUP") != "yes":
        print("ERROR: Remote MongoDB requires CONFIRM_PROD_CLEANUP=yes")
        sys.exit(1)


async def main() -> None:
    _assert_confirmed()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=12000)
    database = client[os.environ.get("DB_NAME", "civicsign")]
    demo_email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    result = await cleanup_test_accounts(database, demo_email=demo_email)
    print(f"Deleted {result['deleted_count']} test account(s):")
    for email in result.get("deleted", []):
        print(f"  - {email}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())