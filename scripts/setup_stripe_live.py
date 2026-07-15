#!/usr/bin/env python3
"""Configure Stripe for LIVE payments and Emergent-style Checkout branding.

Run after setting sk_live_... in backend/.env or Render:

  cd backend && .venv/bin/python ../scripts/setup_stripe_live.py

This script:
  1. Verifies the API key is live (not test)
  2. Applies CivicSign brand colours to Stripe Checkout (dark left panel + teal accent)
  3. Uploads the app logo for checkout header
  4. Ensures the annual discount coupon exists (2 months free on yearly plans)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
ENV_PATH = BACKEND / ".env"
LOGO_PATH = ROOT / "frontend" / "public" / "logo512.png"

PRIMARY = os.environ.get("STRIPE_BRAND_PRIMARY", "#122120")
ACCENT = os.environ.get("STRIPE_BRAND_ACCENT", "#2DD4BF")
ANNUAL_COUPON_ID = "civicsign_annual_2mo_free"
ANNUAL_COUPON_PERCENT = 16.6667


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_PATH)
    except ImportError:
        pass


def _require_live_key() -> str:
    key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not key:
        print("ERROR: STRIPE_API_KEY is not set.")
        print(f"Add sk_live_... to {ENV_PATH} or Render env vars.")
        sys.exit(1)
    if key.startswith("sk_test_"):
        print("ERROR: You are still on a TEST key (sk_test_...).")
        print("Switch to live keys: https://dashboard.stripe.com/apikeys")
        sys.exit(1)
    if not key.startswith("sk_live_"):
        print("ERROR: STRIPE_API_KEY does not look like a live secret key.")
        sys.exit(1)
    return key


def _upload_logo(stripe) -> str | None:
    if not LOGO_PATH.is_file():
        print(f"WARN: logo not found at {LOGO_PATH}, skipping logo upload")
        return None
    with LOGO_PATH.open("rb") as handle:
        uploaded = stripe.File.create(file=handle, purpose="business_logo")
    print(f"OK: uploaded logo -> {uploaded.id}")
    return uploaded.id


def main() -> int:
    _load_env()
    key = _require_live_key()

    import stripe

    stripe.api_key = key
    account = stripe.Account.retrieve()
    print(f"Stripe account: {account.id}")

    logo_id = _upload_logo(stripe)
    branding = {
        "primary_color": PRIMARY,
        "secondary_color": ACCENT,
    }
    if logo_id:
        branding["logo"] = logo_id
        branding["icon"] = logo_id

    stripe.Account.modify(settings={"branding": branding})
    print(f"OK: branding applied (primary={PRIMARY}, accent={ACCENT})")

    try:
        stripe.Coupon.retrieve(ANNUAL_COUPON_ID)
        print(f"OK: annual coupon {ANNUAL_COUPON_ID} already exists")
    except stripe.error.InvalidRequestError:
        stripe.Coupon.create(
            id=ANNUAL_COUPON_ID,
            percent_off=ANNUAL_COUPON_PERCENT,
            duration="forever",
            name="Annual plan discount — 2 months free",
        )
        print(f"OK: created annual coupon {ANNUAL_COUPON_ID}")

    webhook = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if not webhook:
        print()
        print("NEXT: Create a LIVE webhook in Stripe Dashboard:")
        print("  URL: https://api.civicsign.co.uk/api/webhook/stripe")
        print("  Events: checkout.session.completed, checkout.session.expired,")
        print("          customer.subscription.*, invoice.payment_failed, charge.refunded")
        print("  Copy whsec_... into Render -> STRIPE_WEBHOOK_SECRET")
    else:
        print("OK: STRIPE_WEBHOOK_SECRET is set")

    print()
    print("Promo codes: Stripe Dashboard → Products → Coupons → Promotion codes")
    print("  Create codes (e.g. LAUNCH50) — customers enter them on the Checkout page.")
    print()
    print("LIVE payments ready. Set on Render:")
    print("  STRIPE_API_KEY=sk_live_...")
    print("  STRIPE_WEBHOOK_SECRET=whsec_...")
    print("  STRIPE_REQUIRE_LIVE=true")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())