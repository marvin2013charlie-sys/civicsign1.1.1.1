#!/usr/bin/env python3
"""Verify Stripe and Resend are configured and reachable."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "backend" / ".env"


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_PATH)
    except ImportError:
        pass


def _mask(value: str) -> str:
    if len(value) <= 10:
        return "***"
    return f"{value[:7]}...{value[-4:]}"


def check_resend() -> tuple[bool, str]:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "").strip()
    if not key:
        return False, "RESEND_API_KEY is not set in backend/.env"
    if not sender:
        return False, "SENDER_EMAIL is not set in backend/.env"

    try:
        import resend
        resend.api_key = key
        # Lightweight API call — list domains (works with valid key)
        domains = resend.Domains.list()
        count = len(domains.get("data", [])) if isinstance(domains, dict) else 0
        return True, f"Resend OK — API key valid, {count} domain(s) on account, sender={sender}"
    except Exception as exc:
        return False, f"Resend failed: {exc}"


def check_stripe() -> tuple[bool, str]:
    key = os.environ.get("STRIPE_API_KEY", "").strip()
    webhook = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if not key:
        return False, "STRIPE_API_KEY is not set in backend/.env"
    if not webhook:
        return False, "STRIPE_WEBHOOK_SECRET is not set (needed for webhooks; use Stripe CLI locally)"

    try:
        import stripe
        stripe.api_key = key
        account = stripe.Account.retrieve()
        mode = "test" if key.startswith("sk_test_") else "live" if key.startswith("sk_live_") else "unknown"
        name = getattr(account, "settings", None)
        display = account.id if account else "connected"
        return True, f"Stripe OK — mode={mode}, account={display}, webhook secret set ({len(webhook)} chars)"
    except Exception as exc:
        return False, f"Stripe failed: {exc}"


def main() -> int:
    _load_env()
    if not ENV_PATH.exists():
        print(f"Missing {ENV_PATH} — copy from backend/.env.example first.")
        return 1

    print("CivicSign integration check")
    print(f"Env file: {ENV_PATH}")
    print()

    checks = [
        ("Resend (email)", check_resend),
        ("Stripe (billing)", check_stripe),
    ]
    failed = 0
    for name, fn in checks:
        ok, detail = fn()
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {name}")
        print(f"       {detail}")
        if not ok:
            failed += 1

    print()
    if failed:
        print("Next steps:")
        print("  1. Open backend/.env and paste your keys (see backend/.env.example)")
        print("  2. Resend: https://resend.com/api-keys")
        print("  3. Stripe:  https://dashboard.stripe.com/test/apikeys")
        print("  4. Local webhook: stripe listen --forward-to localhost:8001/api/webhook/stripe")
        print("  5. Restart backend, then re-run: python3 scripts/verify_integrations.py")
        return 1

    print("All integrations configured. Restart backend if it is already running.")
    print("Smoke test Stripe: make smoke  (check 4.6 no longer SKIP)")
    return 0


if __name__ == "__main__":
    sys.exit(main())