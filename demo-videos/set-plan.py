#!/usr/bin/env python3
"""Set demo@example.com plan with valid billing signature."""
import sys
from pathlib import Path
from datetime import datetime, timezone

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from pymongo import MongoClient
from billing import _generate_plan_signature

EMAIL = "demo@example.com"
plan = sys.argv[1] if len(sys.argv) > 1 else "free"

mdb = MongoClient("mongodb://localhost:27017").civicsign
user = mdb.users.find_one({"email": EMAIL})
if not user:
    raise SystemExit(f"User {EMAIL} not found")

if plan == "free":
    mdb.users.update_one({"email": EMAIL}, {"$set": {
        "plan": "free",
        "plan_signature": None,
        "plan_upgraded_via_payment": False,
        "plan_updated_at": datetime.now(timezone.utc).isoformat(),
    }})
else:
    ts = datetime.now(timezone.utc).isoformat()
    sig = _generate_plan_signature(user["user_id"], plan, ts)
    mdb.users.update_one({"email": EMAIL}, {"$set": {
        "plan": plan,
        "plan_signature": sig,
        "plan_upgraded_via_payment": True,
        "plan_updated_at": ts,
    }})
print(f"Set {EMAIL} -> {plan}")