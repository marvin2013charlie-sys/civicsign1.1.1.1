#!/usr/bin/env python3
"""Email users who were upgraded by an admin before plan-change emails existed.

Admin plan grants used to notify nobody (fixed in admin.py), so accounts
upgraded through the console never received their confirmation. This finds
them and, only when asked, sends the same upgrade email the Stripe flow uses.

Dry run (default — prints recipients, sends nothing):
  backend/.venv/bin/python scripts/backfill_admin_plan_emails.py

Against production, still a dry run. Pass the credentials file with --env-file;
the script reads it directly, so an Atlas URL containing & needs no quoting:
  backend/.venv/bin/python scripts/backfill_admin_plan_emails.py --env-file /path/to/prod.env

Actually send (needs RESEND_API_KEY and the explicit confirm flag):
  CONFIRM_SEND=yes backend/.venv/bin/python scripts/backfill_admin_plan_emails.py \
    --env-file /path/to/prod.env --send

Options:
  --plan pro|business|all   which granted plan to target (default: pro)
  --send                    send for real instead of listing
  --env-file PATH           load MONGO_URL / RESEND_API_KEY from this file
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / "backend" / ".env")

import email_service  # noqa: E402

PLAN_LABELS = {"pro": "Pro", "business": "Business"}


def settings_url() -> str:
    base = (os.environ.get("FRONTEND_URL") or "https://civicsign.co.uk").rstrip("/")
    return f"{base}/settings"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default="pro", choices=["pro", "business", "all"])
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--env-file", help="file holding MONGO_URL / RESEND_API_KEY; read directly "
                                       "so values containing & need no shell quoting")
    args = ap.parse_args()

    if args.env_file:
        env_path = Path(args.env_file).expanduser()
        if not env_path.is_file():
            print(f"env file not found: {env_path}", file=sys.stderr)
            return 1
        load_dotenv(env_path, override=True)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "civicsign")
    db = MongoClient(mongo_url, serverSelectionTimeoutMS=8000)[db_name]

    plans = ["pro", "business"] if args.plan == "all" else [args.plan]
    query = {"admin_plan_grant": True, "plan": {"$in": plans}}
    users = list(db.users.find(query, {"user_id": 1, "email": 1, "name": 1, "plan": 1,
                                       "plan_updated_at": 1, "billing_interval": 1,
                                       "billing_emails_sent": 1, "_id": 0}))

    host = mongo_url.split("@")[-1].split("/")[0]
    print(f"database: {db_name} at {host}")
    print(f"admin-granted accounts on {'/'.join(plans)}: {len(users)}")

    pending = []
    for u in users:
        key = f"admin_plan_backfill_{u['plan']}"
        already = key in (u.get("billing_emails_sent") or {})
        flag = "already emailed" if already else "WOULD EMAIL"
        print(f"  [{flag}] {u.get('email')} | {u.get('plan')} | granted {u.get('plan_updated_at')}")
        if not already:
            pending.append((u, key))

    if not args.send:
        print(f"\nDry run. {len(pending)} would be emailed. Re-run with --send and CONFIRM_SEND=yes to send.")
        return 0

    if os.environ.get("CONFIRM_SEND") != "yes":
        print("\nRefusing to send: set CONFIRM_SEND=yes to confirm.", file=sys.stderr)
        return 1
    if not email_service.is_configured():
        print("\nRefusing to send: RESEND_API_KEY is not configured.", file=sys.stderr)
        return 1

    sent = failed = 0
    for u, key in pending:
        claimed = db.users.update_one(
            {"user_id": u["user_id"], f"billing_emails_sent.{key}": {"$exists": False}},
            {"$set": {f"billing_emails_sent.{key}": datetime.now(timezone.utc).isoformat()}},
        )
        if not claimed.modified_count:
            continue  # someone else claimed it — never double-send
        try:
            email_service.send_plan_upgrade_confirmation(
                u["email"], u.get("name") or "", PLAN_LABELS.get(u["plan"], u["plan"].title()),
                "monthly" if (u.get("billing_interval") or "monthly") == "monthly" else "annual",
                settings_url(), previous_plan_name="Free",
            )
            sent += 1
            print(f"  sent -> {u['email']}")
        except Exception as exc:  # unclaim so a later run can retry
            failed += 1
            db.users.update_one({"user_id": u["user_id"]}, {"$unset": {f"billing_emails_sent.{key}": ""}})
            print(f"  FAILED -> {u['email']}: {exc}", file=sys.stderr)

    print(f"\nsent: {sent} | failed: {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
