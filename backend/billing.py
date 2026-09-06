"""Stripe billing for CivicSign.

Recurring subscription Checkout for plan upgrades (Pro / Business) plus one-time
Checkout for extra document credits, using the official Stripe SDK. Prices are
defined server-side ONLY and never trusted from the client. Every attempt is
recorded in `payment_transactions`, and plan upgrades are applied idempotently
(guarded by a `processed` flag) from either the status-polling endpoint or the
webhook.

Access is gated on live subscription status: only `active`/`trialing` grants the
paid plan. A failed renewal or cancellation (past_due / unpaid / canceled) clears
the plan signature, so get_effective_plan() returns 'free' and the service stops.

SECURITY HARDENING:
- Webhook signatures verified cryptographically (no spoofing)
- Plan upgrades protected with database locks (prevents race conditions)
- Rate limiting on status polling (prevents brute force)
- Idempotency keys enforced
- No client-side plan modifications possible
"""
import os
import uuid
import asyncio
import logging
import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo import ReturnDocument
from rate_limits import limiter

import stripe

from db import db
from auth import get_current_user, _public_user
from security_utils import is_dev_mode, validate_redirect_base
from models import (
    BillingPortalRequest,
    CancelSubscriptionRequest,
    CheckoutRequest,
    DocumentCheckoutRequest,
    UpgradeConfirmRequest,
)
from tax import UK_VAT_PERCENT, tax_breakdown
import billing_emails

logger = logging.getLogger("civicsign.billing")

billing_router = APIRouter(prefix="/api", tags=["billing"])

CURRENCY = "gbp"
EXTRA_DOCUMENT_PRICE_GBP = 0.80

# Server-side, fixed plan catalogue. The frontend NEVER sends amounts.
PRO_MONTHLY_GBP = 15.00
BUSINESS_MONTHLY_GBP = 79.00
YEARLY_MONTHS_PAID = 10  # pay 10 months, get 12
ANNUAL_COUPON_ID = "civicsign_annual_2mo_free"
ANNUAL_COUPON_PERCENT = round((12 - YEARLY_MONTHS_PAID) / 12 * 100, 4)
STRIPE_BRAND_PRIMARY = os.environ.get("STRIPE_BRAND_PRIMARY", "#122120")
STRIPE_BRAND_ACCENT = os.environ.get("STRIPE_BRAND_ACCENT", "#2DD4BF")
# First-time subscribers: 30-day trial on monthly/yearly checkout (set 0 to disable).
STRIPE_SUBSCRIPTION_TRIAL_DAYS = int(os.environ.get("STRIPE_SUBSCRIPTION_TRIAL_DAYS", "30") or "0")

PLANS = {
    "pro": {
        "name": "Pro",
        "amount_monthly": PRO_MONTHLY_GBP,
        "amount_yearly": PRO_MONTHLY_GBP * YEARLY_MONTHS_PAID,
    },
    "business": {
        "name": "Business",
        "amount_monthly": BUSINESS_MONTHLY_GBP,
        "amount_yearly": BUSINESS_MONTHLY_GBP * YEARLY_MONTHS_PAID,
    },
}

PLAN_TIER = {"free": 0, "pro": 1, "business": 2}


def _plan_amount(plan_id: str, billing_interval: str) -> float:
    plan = PLANS[plan_id]
    interval = (billing_interval or "monthly").lower().strip()
    if interval == "yearly":
        return float(plan["amount_yearly"])
    if interval != "monthly":
        raise HTTPException(status_code=400, detail="billing_interval must be monthly or yearly")
    return float(plan["amount_monthly"])


def _price_data(product_name: str, unit_ex_vat: float, *, description: str = "", recurring: dict | None = None) -> dict:
    """Inline Stripe Price (ex-VAT) with explicit tax behaviour for live Checkout."""
    product_data = {"name": product_name}
    if description:
        product_data["description"] = description
    data = {
        "currency": CURRENCY,
        "product_data": product_data,
        "unit_amount": int(round(float(unit_ex_vat) * 100)),
        "tax_behavior": "exclusive",
    }
    if recurring:
        data["recurring"] = recurring
    return data


def _stripe_line_items(product_name: str, unit_ex_vat: float, quantity: int = 1) -> list:
    """Checkout line items: net price + separate VAT line (prices excl. tax)."""
    total_ex = round(float(unit_ex_vat) * quantity, 2)
    tax = tax_breakdown(total_ex)
    items = [
        {
            "price_data": _price_data(product_name, unit_ex_vat),
            "quantity": quantity,
        },
    ]
    if tax["vat_amount"] > 0:
        items.append({
            "price_data": _price_data(f"VAT ({UK_VAT_PERCENT}%)", tax["vat_amount"]),
            "quantity": 1,
        })
    return items


def _stripe_interval(billing_interval: str) -> str:
    """Map our interval to a Stripe recurring interval."""
    return "year" if (billing_interval or "monthly").lower().strip() == "yearly" else "month"


def _stripe_recurring_line_items(product_name: str, unit_ex_vat: float, billing_interval: str, *, product_description: str = "") -> list:
    """Recurring subscription line items: net price + separate VAT line, both
    billed on the same interval so the whole subscription renews together."""
    interval = _stripe_interval(billing_interval)
    tax = tax_breakdown(float(unit_ex_vat))
    recurring = {"interval": interval}
    items = [
        {
            "price_data": _price_data(
                product_name,
                unit_ex_vat,
                description=product_description,
                recurring=recurring,
            ),
            "quantity": 1,
        },
    ]
    if tax["vat_amount"] > 0:
        items.append({
            "price_data": _price_data(
                f"UK VAT ({UK_VAT_PERCENT}%)",
                tax["vat_amount"],
                description="Value Added Tax",
                recurring=recurring,
            ),
            "quantity": 1,
        })
    return items


def _stripe_key_mode(api_key: str | None = None) -> str | None:
    key = (api_key or os.environ.get("STRIPE_API_KEY") or "").strip()
    if not key:
        return None
    if key.startswith("sk_live_"):
        return "live"
    if key.startswith("sk_test_"):
        return "test"
    return "unknown"


def _production_requires_live() -> bool:
    """True when this deployment must use sk_live_ (production site, not local dev)."""
    if is_dev_mode():
        return False
    if os.environ.get("STRIPE_REQUIRE_LIVE", "").lower() in ("1", "true", "yes"):
        return True
    frontend = (os.environ.get("FRONTEND_URL") or os.environ.get("PUBLIC_SITE_URL") or "").lower()
    cookie_secure = os.environ.get("COOKIE_SECURE", "").lower() in ("1", "true", "yes")
    if cookie_secure and frontend and "localhost" not in frontend and "127.0.0.1" not in frontend:
        return True
    return False


def _require_live_in_production(api_key: str) -> None:
    """Block test keys on production — fake/test cards must never grant paid plans."""
    if not _production_requires_live():
        return
    mode = _stripe_key_mode(api_key)
    if mode != "live":
        logger.error(f"[billing] production blocked: Stripe key mode={mode}, live required")
        raise HTTPException(
            status_code=503,
            detail=(
                "Live card payments are not enabled yet. "
                "Upgrades are blocked until Stripe live keys (sk_live_) are configured."
            ),
        )


def _checkout_session_extras(
    *,
    mode: str,
    allow_promo_codes: bool = True,
    trial_days: int | None = None,
) -> dict:
    """Emergent-style hosted checkout: UK address, clear CTA, subscription wording."""
    if mode == "subscription" and trial_days and trial_days > 0:
        submit_msg = (
            f"Start your {trial_days}-day free trial — card required, cancel anytime before billing"
        )
    elif mode == "subscription":
        submit_msg = "Subscribe securely"
    else:
        submit_msg = "Pay securely"
    extras = {
        "locale": "en-GB",
        "billing_address_collection": "required",
        "customer_update": {"address": "auto", "name": "auto"},
        # Let Stripe use Dashboard payment-method settings (card-only is configured there).
        "phone_number_collection": {"enabled": False},
        "custom_text": {
            "submit": {"message": submit_msg},
        },
    }
    # Stripe disallows promotion codes when automatic discounts[] are also set.
    if allow_promo_codes:
        extras["allow_promotion_codes"] = True
    return extras


def _promo_code_from_session(session) -> str | None:
    """Return the human-readable promo code applied on a completed Checkout session."""
    data = _stripe_object_dict(session)
    total_details = data.get("total_details") or {}
    if not total_details.get("amount_discount"):
        return None
    for discount in data.get("discounts") or []:
        if not isinstance(discount, dict):
            discount = _stripe_object_dict(discount)
        promo = discount.get("promotion_code")
        if isinstance(promo, dict):
            code = promo.get("code")
            if code:
                return str(code)
        coupon = discount.get("coupon")
        if isinstance(coupon, dict) and coupon.get("name"):
            return str(coupon["name"])
    return None


async def _record_checkout_promo(session_id: str, session) -> None:
    promo_code = _promo_code_from_session(session)
    if not promo_code:
        return
    data = _stripe_object_dict(session)
    discount_cents = int((data.get("total_details") or {}).get("amount_discount") or 0)
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "promotion_code": promo_code,
            "promotion_discount": round(discount_cents / 100, 2),
            "updated_at": _now(),
        }},
    )


def _annual_savings_ex_vat(plan_id: str) -> float:
    plan = PLANS[plan_id]
    return round(float(plan["amount_monthly"]) * (12 - YEARLY_MONTHS_PAID), 2)


async def _get_or_create_annual_coupon() -> str:
    """Coupon shown on Stripe Checkout left panel (e.g. '2 months free')."""
    env_id = os.environ.get("STRIPE_ANNUAL_COUPON_ID")
    if env_id:
        return env_id
    _require_stripe_key()
    try:
        existing = await asyncio.to_thread(stripe.Coupon.retrieve, ANNUAL_COUPON_ID)
        return existing.id
    except stripe.error.InvalidRequestError:
        pass
    coupon = await asyncio.to_thread(
        stripe.Coupon.create,
        id=ANNUAL_COUPON_ID,
        percent_off=ANNUAL_COUPON_PERCENT,
        duration="forever",
        name=f"Annual plan discount — {12 - YEARLY_MONTHS_PAID} months free",
    )
    return coupon.id


def _trial_already_redeemed(user: dict) -> bool:
    """True when this account has already used (or forfeited) its one free trial."""
    if user.get("subscription_trial_used"):
        return True
    if user.get("plan_upgraded_via_payment"):
        return True
    return False


async def _user_had_paid_subscription(user_id: str) -> bool:
    """Detect prior paid plan checkouts even if the user was later downgraded to Free."""
    doc = await db.payment_transactions.find_one(
        {
            "user_id": user_id,
            "plan_id": {"$in": list(PLANS.keys())},
            "payment_status": "paid",
        },
        {"_id": 1},
    )
    return doc is not None


async def _mark_trial_redeemed(user_id: str) -> None:
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_trial_used": True, "updated_at": _now()}},
    )


async def _resolve_checkout_trial(user: dict) -> tuple[int | None, bool]:
    """Return (trial_days, trial_already_redeemed) for self-serve checkout."""
    days = STRIPE_SUBSCRIPTION_TRIAL_DAYS
    if days <= 0:
        return None, False
    if _trial_already_redeemed(user):
        return None, True
    if await _user_had_paid_subscription(user["user_id"]):
        await _mark_trial_redeemed(user["user_id"])
        return None, True
    if user.get("stripe_subscription_id"):
        return None, True
    status = (user.get("subscription_status") or "").lower()
    if status in ACTIVE_SUBSCRIPTION_STATES:
        return None, True
    if (user.get("plan") or "free").lower().strip() != "free":
        return None, True
    return days, False


def _checkout_trial_days(user: dict) -> int | None:
    """Sync trial check for unit tests — mirrors _resolve_checkout_trial without payment history."""
    days = STRIPE_SUBSCRIPTION_TRIAL_DAYS
    if days <= 0:
        return None
    if _trial_already_redeemed(user):
        return None
    if user.get("stripe_subscription_id"):
        return None
    status = (user.get("subscription_status") or "").lower()
    if status in ACTIVE_SUBSCRIPTION_STATES:
        return None
    if (user.get("plan") or "free").lower().strip() != "free":
        return None
    return days


def _renewal_phrase(billing_interval: str, renewal_inc_vat: float) -> str:
    interval = (billing_interval or "monthly").lower().strip()
    if interval == "yearly":
        return f"Then £{renewal_inc_vat:.2f} per year incl. VAT"
    return f"Then £{renewal_inc_vat:.2f} per month incl. VAT"


async def _stripe_subscription_checkout_payload(
    plan_id: str,
    billing_interval: str,
    *,
    trial_days: int | None = None,
) -> tuple[list, list, float]:
    """Build line items for Stripe Checkout (Stripe adds 'Subscribe to' — do not duplicate)."""
    plan = PLANS[plan_id]
    interval = (billing_interval or "monthly").lower().strip()
    charge_ex_vat = _plan_amount(plan_id, billing_interval)
    renewal_inc_vat = tax_breakdown(charge_ex_vat)["amount_inc_vat"]
    renewal_note = _renewal_phrase(billing_interval, renewal_inc_vat)
    trial_note = (
        f"{trial_days}-day free trial, then {renewal_note.lower()}"
        if trial_days and trial_days > 0
        else renewal_note
    )
    product_name = _plan_product_name(plan_id, billing_interval)

    if interval == "yearly":
        list_ex_vat = float(plan["amount_monthly"]) * 12
        savings = _annual_savings_ex_vat(plan_id)
        product_description = (
            f"List £{list_ex_vat:.2f} excl. VAT · Annual plan discount −£{savings:.2f} "
            f"({12 - YEARLY_MONTHS_PAID} months free) · {trial_note}"
        )
        line_items = _stripe_recurring_line_items(
            product_name,
            charge_ex_vat,
            billing_interval,
            product_description=product_description,
        )
        return line_items, [], charge_ex_vat

    product_description = trial_note
    line_items = _stripe_recurring_line_items(
        product_name,
        charge_ex_vat,
        billing_interval,
        product_description=product_description,
    )
    return line_items, [], charge_ex_vat


# Only these Stripe subscription states grant paid access. Anything else
# (past_due, unpaid, canceled, incomplete, incomplete_expired) revokes the
# plan — so a failed renewal payment stops the service.
ACTIVE_SUBSCRIPTION_STATES = frozenset({"active", "trialing"})
RETENTION_COUPON_ID = "civicsign_retention_50_1m"


def extra_document_price_label(*, include_tax: bool = True) -> str:
    """Human-readable extra-document price for API errors and assistants."""
    if EXTRA_DOCUMENT_PRICE_GBP < 1:
        base = f"{int(round(EXTRA_DOCUMENT_PRICE_GBP * 100))}p"
    elif EXTRA_DOCUMENT_PRICE_GBP == int(EXTRA_DOCUMENT_PRICE_GBP):
        base = f"£{int(EXTRA_DOCUMENT_PRICE_GBP)}"
    else:
        base = f"£{EXTRA_DOCUMENT_PRICE_GBP:.2f}"
    if not include_tax:
        return base
    total = tax_breakdown(EXTRA_DOCUMENT_PRICE_GBP)["amount_inc_vat"]
    return f"{base} excl. VAT (£{total:.2f} incl. VAT)"


def _plan_product_name(plan_id: str, billing_interval: str) -> str:
    plan = PLANS[plan_id]
    interval = (billing_interval or "monthly").lower().strip()
    if interval == "yearly":
        return f"CivicSign {plan['name']} plan (annual — 2 months free)"
    return f"CivicSign {plan['name']} plan (monthly)"

# Webhook signing secret - MUST be set in environment
def get_webhook_secret() -> str:
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET environment variable is not set")
    return secret

from plan_signing import (
    generate_plan_signature as _generate_plan_signature,
    verify_plan_signature as _verify_plan_signature,
    get_effective_plan,
    is_organisation_member,
    get_plan_secret,
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _configure_stripe(*, enforce_live: bool = True) -> str:
    api_key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Billing is not configured")
    if enforce_live:
        _require_live_in_production(api_key)
    stripe.api_key = api_key
    return api_key


def _require_stripe_key() -> str:
    return _configure_stripe(enforce_live=True)


def _stripe_subscription_missing(exc: Exception) -> bool:
    if isinstance(exc, stripe.error.InvalidRequestError):
        code = getattr(exc, "code", None) or ""
        if code == "resource_missing":
            return True
    msg = str(exc).lower()
    return "no such subscription" in msg or "resource_missing" in msg


def _stripe_customer_missing(exc: Exception) -> bool:
    if isinstance(exc, stripe.error.InvalidRequestError):
        code = getattr(exc, "code", None) or ""
        if code == "resource_missing":
            return True
    msg = str(exc).lower()
    return "no such customer" in msg or "resource_missing" in msg


async def _resolve_stripe_customer(user: dict) -> str:
    """Return a valid Stripe customer id, recreating if the stored one is from test/wrong account."""
    cid = user.get("stripe_customer_id")
    _configure_stripe(enforce_live=False)
    if cid:
        try:
            await asyncio.to_thread(stripe.Customer.retrieve, cid)
            return cid
        except Exception as e:
            if not _stripe_customer_missing(e):
                raise
            logger.warning(
                f"[billing] stripe customer {cid} missing for {user['user_id']} — creating a new one"
            )
    customer = await asyncio.to_thread(
        stripe.Customer.create,
        email=user.get("email"),
        name=user.get("name") or user.get("email"),
        metadata={"user_id": user["user_id"]},
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"stripe_customer_id": customer.id, "updated_at": _now()}},
    )
    return customer.id


async def _apply_document_credits(user_id: str, credits: int, session_id: str) -> bool:
    if credits < 1:
        return False
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$inc": {"extra_document_credits": credits}},
    )
    if result.matched_count == 0:
        logger.error(f"[billing] user {user_id} not found for document credits")
        return False
    logger.info(
        f"[billing] added {credits} document credit(s) to user={user_id} (session {session_id})"
    )
    return True


async def _get_or_create_customer(user: dict) -> str:
    """Return a valid Stripe customer id (recreates if test/wrong-account id is stored)."""
    return await _resolve_stripe_customer(user)


def _stripe_checkout_error_detail(exc: Exception) -> str:
    """Safe, user-facing detail for Stripe Checkout failures."""
    if isinstance(exc, stripe.error.InvalidRequestError):
        msg = (getattr(exc, "user_message", None) or str(exc) or "").strip()
        low = msg.lower()
        if "no such customer" in low:
            return "Your billing profile needs to be refreshed. Please try again."
        if "payment_method_types" in low or "automatic_payment_methods" in low:
            return "Card checkout is not fully configured on Stripe yet. Please contact support."
        if "tax_behavior" in low or "tax" in low:
            return "Tax settings need a moment to sync. Please try again in a minute."
        if msg and len(msg) < 200:
            return msg
    return "Could not start checkout. Please try again."


def _sub_period_end_iso(subscription: dict) -> str | None:
    """Support both legacy and item-level Stripe billing periods (Basil+).

    CivicSign's plan and VAT items renew together. Use the earliest deadline
    defensively if their periods ever differ; never extend access using one item.
    """
    data = _stripe_object_dict(subscription)
    timestamps = [data.get("current_period_end")]
    items = data.get("items") or {}
    timestamps.extend(item.get("current_period_end") for item in items.get("data", []))
    if data.get("status") == "trialing":
        timestamps.append(data.get("trial_end"))
    ends = []
    for ts in timestamps:
        if ts is None:
            continue
        try:
            ends.append(datetime.fromtimestamp(int(ts), tz=timezone.utc))
        except (TypeError, ValueError, OverflowError, OSError):
            continue
    return min(ends).isoformat() if ends else None


async def _activate_subscription(
    user_id: str,
    plan_id: str,
    *,
    subscription_id: str | None = None,
    customer_id: str | None = None,
    billing_interval: str = "monthly",
    subscription_status: str = "active",
    period_end_iso: str | None = None,
) -> bool:
    """Grant/renew a paid plan and record the live subscription state."""
    if plan_id not in PLANS:
        logger.error(f"[billing] refusing to activate unknown plan {plan_id} for {user_id}")
        return False
    now_ts = _now()
    interval = (billing_interval or "monthly").lower().strip()
    if interval not in ("monthly", "yearly"):
        interval = "monthly"
    patch = {
        "plan": plan_id,
        "plan_updated_at": now_ts,
        "plan_signature": _generate_plan_signature(user_id, plan_id, now_ts),
        "plan_upgraded_via_payment": True,
        "billing_interval": interval,
        "subscription_status": subscription_status,
        "updated_at": now_ts,
    }
    if subscription_id:
        patch["stripe_subscription_id"] = subscription_id
    if customer_id:
        patch["stripe_customer_id"] = customer_id
    if period_end_iso:
        patch["subscription_current_period_end"] = period_end_iso
    # One trial per account — any paid subscription marks the trial as consumed.
    patch["subscription_trial_used"] = True
    result = await db.users.update_one({"user_id": user_id}, {"$set": patch})
    if result.matched_count == 0:
        logger.error(f"[billing] user {user_id} not found to activate subscription")
        return False
    logger.info(f"[billing] activated plan={plan_id} for user={user_id} (status={subscription_status})")
    return True


async def _downgrade_user_to_free(
    user_id: str, reason: str, subscription_status: str = "canceled", *,
    preserve_subscription: bool = False,
    expected_user: dict | None = None,
) -> None:
    """Revoke paid access. Clearing plan_signature makes get_effective_plan()
    return 'free' everywhere, so quotas and features immediately revert."""
    query = {"user_id": user_id}
    if expected_user is not None:
        # A renewal may arrive between the expiry check and this database write.
        # Only revoke the exact subscription snapshot that was checked.
        for field in ("plan_updated_at", "stripe_subscription_id",
                      "subscription_status", "subscription_current_period_end"):
            query[field] = expected_user.get(field)
    user_before = await db.users.find_one(
        query,
        {"_id": 0, "email": 1, "name": 1, "plan": 1, "billing_interval": 1, "user_id": 1},
    )
    if not user_before:
        return
    previous_plan = user_before.get("plan")
    now_ts = _now()
    result = await db.users.update_one(
        query,
        {
            "$set": {
                "plan": "free",
                "billing_interval": "monthly",
                "plan_updated_at": now_ts,
                "plan_signature": None,
                "plan_upgraded_via_payment": False,
                "admin_plan_grant": False,
                "subscription_status": subscription_status,
                "subscription_cancel_at_period_end": False,
                "monthly_envelope_limit": None,
                "enterprise_unlimited": False,
                "updated_at": now_ts,
            },
            "$unset": {
                **({} if preserve_subscription else {"stripe_subscription_id": ""}),
                "subscription_current_period_end": "",
            },
        },
    )
    if result.matched_count == 0:
        return
    logger.info(f"[billing] downgraded user={user_id} to free ({reason}, status={subscription_status})")
    if user_before and previous_plan in PLANS:
        await billing_emails.notify_plan_downgrade(
            user_before,
            plan_id="free",
            billing_interval="monthly",
            dedupe_key=f"downgrade_free_{user_id}_{subscription_status}_{now_ts[:10]}",
            previous_plan=previous_plan,
            effective="immediate",
        )


async def ensure_period_end_downgrade(user: dict) -> dict:
    """If paid access has expired without upgrade, persist Free and return fresh user."""
    from plan_signing import should_persist_plan_downgrade, paid_access_should_expire

    if not user or not should_persist_plan_downgrade(user):
        return user

    # A delayed renewal webhook must not remove a payment that already succeeded.
    # Refresh only at the access boundary; valid paid requests need no Stripe call.
    sub_id = user.get("stripe_subscription_id")
    if (sub_id and not user.get("admin_plan_grant")
            and user.get("subscription_status") in ACTIVE_SUBSCRIPTION_STATES):
        try:
            await _refresh_subscription_state(sub_id)
            fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
            if fresh:
                user = fresh
            if not should_persist_plan_downgrade(user):
                return user
        except Exception as exc:
            logger.warning(f"[billing] expiry reconciliation failed for {sub_id}: {exc}")

    if user.get("admin_plan_grant") and paid_access_should_expire(user):
        reason = "admin plan grant expired"
    elif user.get("subscription_cancel_at_period_end") and paid_access_should_expire(user):
        reason = "cancel-at-period-end reached"
    elif paid_access_should_expire(user):
        reason = "billing period ended without upgrade"
    else:
        reason = "plan access revoked"

    status = (user.get("subscription_status") or "canceled").lower() or "canceled"
    await _downgrade_user_to_free(
        user["user_id"], reason=reason, subscription_status=status,
        preserve_subscription=bool(user.get("stripe_subscription_id"))
        and status not in ("canceled", "incomplete_expired"),
        expected_user=user,
    )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return fresh or {**user, "plan": "free", "plan_signature": None}


async def process_period_end_downgrades(limit: int = 100) -> int:
    """Background job: downgrade paid users whose bill period ended without upgrade.

    Returns the number of accounts downgraded.
    """
    from plan_signing import paid_access_should_expire, should_persist_plan_downgrade

    query = {
        "plan": {"$in": ["pro", "business"]},
        "role": {"$nin": ["admin", "staff"]},
    }
    # Stream the candidates: limiting the first N rows starves expired accounts
    # behind a large set of still-active subscribers on every sweep.
    cursor = db.users.find(query, {"_id": 0})
    downgraded = 0
    async for user in cursor:
        if user.get("org_id"):
            continue
        if not paid_access_should_expire(user) and not should_persist_plan_downgrade(user):
            continue
        try:
            before_plan = user.get("plan")
            await ensure_period_end_downgrade(user)
            after = await db.users.find_one({"user_id": user["user_id"]}, {"plan": 1, "_id": 0})
            if before_plan != "free" and after and after.get("plan") == "free":
                downgraded += 1
                if downgraded >= limit:
                    break
        except Exception as exc:
            logger.warning(f"[billing] period-end downgrade failed for {user.get('user_id')}: {exc}")
    if downgraded:
        logger.info(f"[billing] period-end auto-downgrade: {downgraded} account(s)")
    return downgraded


async def downgrade_user_for_plan_refund(user_id: str, *, reason: str, cancel_stripe: bool = True) -> bool:
    """Immediately revoke a paid plan after a plan-payment refund (do not wait for period end)."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        logger.warning(f"[billing] plan refund downgrade: user {user_id} not found")
        return False
    sub_id = user.get("stripe_subscription_id")
    if cancel_stripe and sub_id:
        try:
            _require_stripe_key()
            await asyncio.to_thread(stripe.Subscription.cancel, sub_id)
            logger.info(f"[billing] cancelled Stripe subscription {sub_id} after plan refund for {user_id}")
        except Exception as e:
            logger.warning(f"[billing] could not cancel sub {sub_id} on refund for {user_id}: {e}")
    await _downgrade_user_to_free(user_id, reason=reason, subscription_status="canceled")
    return True


def _is_plan_purchase_tx(tx: dict) -> bool:
    return bool(tx.get("plan_id")) and tx.get("purchase_type", "plan") != "extra_document"


def _stripe_resource_id(value) -> str | None:
    """Normalize a Stripe id field that may be a string or expanded object."""
    if not value:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("id")
    return getattr(value, "id", None)


async def _invoice_payment_refs(invoice_id: str) -> dict:
    """Return payment_intent_id and charge_id from a Stripe invoice."""
    invoice = await asyncio.to_thread(
        stripe.Invoice.retrieve,
        invoice_id,
        expand=["payment_intent", "charge"],
    )
    data = _stripe_object_dict(invoice)
    return {
        "payment_intent_id": _stripe_resource_id(data.get("payment_intent")),
        "charge_id": _stripe_resource_id(data.get("charge")),
        "invoice_id": invoice_id,
    }


async def capture_checkout_payment_refs(session_id: str, session=None) -> dict:
    """Persist payment_intent / charge / subscription ids for later admin refunds."""
    _require_stripe_key()
    if session is None:
        session = await asyncio.to_thread(
            stripe.checkout.Session.retrieve,
            session_id,
            expand=["payment_intent", "subscription", "invoice"],
        )
    data = _stripe_object_dict(session)
    patch: dict = {"updated_at": _now()}

    pi = _stripe_resource_id(data.get("payment_intent"))
    if pi:
        patch["payment_intent_id"] = pi

    sub_id = _stripe_resource_id(data.get("subscription"))
    if sub_id:
        patch["subscription_id"] = sub_id

    inv_id = _stripe_resource_id(data.get("invoice"))
    if inv_id:
        patch["invoice_id"] = inv_id
        try:
            refs = await _invoice_payment_refs(inv_id)
            patch.update({k: v for k, v in refs.items() if v})
        except Exception as e:
            logger.warning(f"[billing] could not read invoice {inv_id} for {session_id}: {e}")

    if sub_id and not patch.get("payment_intent_id") and not patch.get("charge_id"):
        try:
            subscription = await asyncio.to_thread(
                stripe.Subscription.retrieve,
                sub_id,
                expand=["latest_invoice.payment_intent", "latest_invoice.charge"],
            )
            sub_data = _stripe_object_dict(subscription)
            latest = sub_data.get("latest_invoice") or {}
            if isinstance(latest, dict):
                if not patch.get("payment_intent_id"):
                    pi = _stripe_resource_id(latest.get("payment_intent"))
                    if pi:
                        patch["payment_intent_id"] = pi
                if not patch.get("charge_id"):
                    ch = _stripe_resource_id(latest.get("charge"))
                    if ch:
                        patch["charge_id"] = ch
                inv_from_sub = _stripe_resource_id(latest)
                if inv_from_sub:
                    patch.setdefault("invoice_id", inv_from_sub)
        except Exception as e:
            logger.warning(f"[billing] could not read subscription {sub_id} for {session_id}: {e}")

    if len(patch) > 1:
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": patch})
    return patch


async def resolve_refund_target_for_tx(tx: dict) -> dict:
    """Build stripe.Refund.create kwargs (payment_intent or charge) for a paid tx."""
    if tx.get("payment_intent_id"):
        return {"payment_intent": tx["payment_intent_id"]}
    if tx.get("charge_id"):
        return {"charge": tx["charge_id"]}

    session_id = tx.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=400,
            detail="This transaction has no Stripe session — cannot issue a refund.",
        )

    patch = await capture_checkout_payment_refs(session_id)
    if patch.get("payment_intent_id"):
        return {"payment_intent": patch["payment_intent_id"]}
    if patch.get("charge_id"):
        return {"charge": patch["charge_id"]}

    raise HTTPException(
        status_code=400,
        detail=(
            "Could not resolve the Stripe payment for this subscription checkout. "
            "Open the transaction in Stripe Dashboard or contact support with the session id."
        ),
    )


async def _user_for_subscription_event(subscription: dict) -> dict | None:
    """Resolve the owning user from a Stripe subscription object."""
    user_id = (subscription.get("metadata") or {}).get("user_id")
    if user_id:
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if u:
            return u
    sub_id = subscription.get("id")
    if sub_id:
        u = await db.users.find_one({"stripe_subscription_id": sub_id}, {"_id": 0})
        if u:
            return u
    customer_id = subscription.get("customer")
    if customer_id:
        return await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
    return None


async def _resolve_charge_refund_state(charge_id: str) -> tuple[str | None, int, int]:
    """Return (payment_intent_id, amount_cents, amount_refunded_cents) for a Stripe charge."""
    _require_stripe_key()
    charge = await asyncio.to_thread(stripe.Charge.retrieve, charge_id)
    if isinstance(charge, dict):
        payment_intent = charge.get("payment_intent")
        amount = int(charge.get("amount") or 0)
        amount_refunded = int(charge.get("amount_refunded") or 0)
    else:
        payment_intent = getattr(charge, "payment_intent", None)
        amount = int(getattr(charge, "amount", 0) or 0)
        amount_refunded = int(getattr(charge, "amount_refunded", 0) or 0)
    if isinstance(payment_intent, dict):
        payment_intent = payment_intent.get("id")
    return payment_intent, amount, amount_refunded


async def _handle_refund_event(obj: dict) -> None:
    """Downgrade immediately when a plan payment is fully refunded."""
    payment_intent = None
    amount_cents = 0
    amount_refunded_cents = 0

    if obj.get("object") == "charge":
        payment_intent = obj.get("payment_intent")
        if isinstance(payment_intent, dict):
            payment_intent = payment_intent.get("id")
        amount_cents = int(obj.get("amount") or 0)
        amount_refunded_cents = int(obj.get("amount_refunded") or 0)
    elif obj.get("object") == "refund":
        charge_id = obj.get("charge")
        if not charge_id:
            return
        try:
            payment_intent, amount_cents, amount_refunded_cents = await _resolve_charge_refund_state(charge_id)
        except Exception as e:
            logger.warning(f"[billing] refund webhook could not resolve charge {charge_id}: {e}")
            return
    else:
        return

    if not payment_intent:
        return

    tx = await db.payment_transactions.find_one({"payment_intent_id": payment_intent}, {"_id": 0})
    if not tx:
        return
    if not _is_plan_purchase_tx(tx):
        return

    is_full = amount_cents > 0 and amount_refunded_cents >= amount_cents
    now_ts = _now()
    await db.payment_transactions.update_one(
        {"payment_intent_id": payment_intent},
        {"$set": {
            "refund_status": "refunded" if is_full else "partial",
            "refund_amount": round(amount_refunded_cents / 100, 2),
            "last_refund_at": now_ts,
            "updated_at": now_ts,
        }},
    )

    if not is_full:
        return

    user_id = tx.get("user_id")
    if not user_id:
        return
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "plan": 1})
    if user and (user.get("plan") or "free") == "free":
        return
    await downgrade_user_for_plan_refund(
        user_id,
        reason=f"plan payment refunded (pi={payment_intent})",
    )


async def _handle_subscription_state(subscription: dict) -> None:
    """Central gate: sync a subscription's status onto the user. Active/trialing
    keeps the plan; anything else stops the service by downgrading to free."""
    user = await _user_for_subscription_event(subscription)
    if not user:
        logger.warning(f"[billing] no user for subscription {subscription.get('id')}")
        return
    status = (subscription.get("status") or "").lower()
    meta = subscription.get("metadata") or {}
    plan_id = (meta.get("plan_id") or user.get("plan") or "").lower().strip()
    interval = (meta.get("billing_interval") or user.get("billing_interval") or "monthly").lower().strip()

    if status in ACTIVE_SUBSCRIPTION_STATES and plan_id in PLANS:
        await _activate_subscription(
            user["user_id"], plan_id,
            subscription_id=subscription.get("id"),
            customer_id=subscription.get("customer"),
            billing_interval=interval,
            subscription_status=status,
            period_end_iso=_sub_period_end_iso(subscription),
        )
        # Keep paid access until period end when user scheduled cancellation.
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_cancel_at_period_end": bool(subscription.get("cancel_at_period_end")),
                "subscription_current_period_end": _sub_period_end_iso(subscription),
                "updated_at": _now(),
            }},
        )
    else:
        await _downgrade_user_to_free(
            user["user_id"],
            reason=f"subscription {subscription.get('id')} status={status}",
            subscription_status=status or "canceled",
            preserve_subscription=status in ("past_due", "unpaid", "incomplete", "paused"),
        )


async def _refresh_subscription_state(sub_id: str) -> None:
    """Reconcile from Stripe's current state, including payment of the latest invoice.

    Errors propagate to webhook callers so Stripe retries instead of losing an
    expiry or renewal update. Request-time expiry still denies unverified access.
    """
    _require_stripe_key()
    subscription = await asyncio.to_thread(
        stripe.Subscription.retrieve, sub_id, expand=["latest_invoice"],
    )
    data = _stripe_object_dict(subscription)
    if data.get("status") == "active":
        invoice = data.get("latest_invoice")
        if isinstance(invoice, str):
            invoice = await asyncio.to_thread(stripe.Invoice.retrieve, invoice)
        invoice = _stripe_object_dict(invoice or {})
        if invoice.get("status") != "paid":
            # An unpaid proration for a requested upgrade is not a failed
            # renewal. Keep the already-paid tier until its existing deadline;
            # the pending-upgrade path grants the new tier only after payment.
            if invoice.get("billing_reason") == "subscription_update":
                from plan_signing import get_effective_plan
                user = await _user_for_subscription_event(data)
                if user and get_effective_plan(user) in PLANS:
                    return
            data["status"] = "past_due"
    await _handle_subscription_state(data)


def _invoice_subscription_id(invoice: dict) -> str | None:
    """Invoice subscription reference before and after Stripe API Basil."""
    legacy = _stripe_resource_id(invoice.get("subscription"))
    parent = invoice.get("parent") or {}
    details = parent.get("subscription_details") or {}
    return legacy or _stripe_resource_id(details.get("subscription"))


def _valid_stripe_session_id(session_id: str) -> bool:
    return isinstance(session_id, str) and session_id.startswith("cs_") and 8 < len(session_id) <= 256


def _stripe_object_dict(obj) -> dict:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return dict(obj)


def _assert_session_user(session, expected_user_id: str) -> None:
    """Ensure Stripe Checkout metadata matches the authenticated user."""
    meta = _stripe_object_dict(session).get("metadata") or {}
    owner = meta.get("user_id")
    if owner and owner != expected_user_id:
        logger.warning(
            f"[billing] session metadata user {owner} does not match {expected_user_id}"
        )
        raise HTTPException(status_code=403, detail="This payment session belongs to another account")


async def _load_checkout_transaction(session_id: str) -> dict | None:
    return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})


async def _verify_webhook_checkout_session(obj: dict) -> dict | None:
    """Reject spoofed or tampered checkout webhooks before fulfilling."""
    session_id = obj.get("id")
    if not _valid_stripe_session_id(session_id):
        logger.warning("[billing] webhook checkout missing valid session id")
        raise HTTPException(status_code=400, detail="Invalid session ID")

    tx = await _load_checkout_transaction(session_id)
    if not tx:
        logger.warning(f"[billing] webhook for unknown session {session_id} — ignoring")
        return None

    meta = obj.get("metadata") or {}
    if meta.get("user_id") != tx.get("user_id"):
        logger.error(f"[billing] webhook metadata user mismatch for {session_id}")
        raise HTTPException(status_code=400, detail="Webhook metadata mismatch")

    if obj.get("payment_status") == "paid":
        amount_total = obj.get("amount_total")
        expected_cents = int(round(float(tx.get("amount") or 0) * 100))
        if amount_total is not None and expected_cents > 0:
            paid_cents = int(amount_total)
            discount_cents = int((obj.get("total_details") or {}).get("amount_discount") or 0)
            if paid_cents > expected_cents or (paid_cents < expected_cents and discount_cents <= 0):
                logger.error(
                    f"[billing] webhook amount mismatch session={session_id} "
                    f"got={amount_total} expected={expected_cents} discount={discount_cents}"
                )
                raise HTTPException(status_code=400, detail="Webhook amount mismatch")

    return tx


def _plan_tier(plan_id: str) -> int:
    return PLAN_TIER.get((plan_id or "").lower().strip(), 0)


def _is_paid_upgrade(
    current_plan: str,
    current_interval: str,
    target_plan: str,
    target_interval: str,
) -> bool:
    """True when moving to a higher plan or a materially higher-priced billing interval."""
    cur_plan = (current_plan or "free").lower().strip()
    tgt_plan = (target_plan or "").lower().strip()
    cur_int = (current_interval or "monthly").lower().strip()
    tgt_int = (target_interval or "monthly").lower().strip()
    if _plan_tier(tgt_plan) > _plan_tier(cur_plan):
        return True
    if _plan_tier(tgt_plan) == _plan_tier(cur_plan) and cur_plan in PLANS:
        if cur_int == "monthly" and tgt_int == "yearly":
            return True
    return False


async def _build_subscription_modify_items(sub_id: str, plan_id: str, billing_interval: str) -> tuple[list, list]:
    """Stripe items[] payload to swap an existing subscription onto a new plan."""
    _require_stripe_key()
    new_line_items, discounts, _amount_ex_vat = await _stripe_subscription_checkout_payload(plan_id, billing_interval)
    subscription = await asyncio.to_thread(stripe.Subscription.retrieve, sub_id)
    sub_dict = _stripe_object_dict(subscription)
    existing_items = (sub_dict.get("items") or {}).get("data") or []
    items_param = [{"id": item["id"], "deleted": True} for item in existing_items]
    for li in new_line_items:
        items_param.append({
            "price": await _subscription_price_id(li["price_data"]),
            "quantity": li["quantity"],
        })
    return items_param, discounts


async def _subscription_price_id(checkout_price_data: dict) -> str:
    """Resolve reusable Prices; subscription updates do not accept Checkout product_data."""
    fingerprint = hashlib.sha256(
        json.dumps(checkout_price_data, sort_keys=True).encode()
    ).hexdigest()[:32]
    lookup_key = f"civicsign_{fingerprint}"
    prices = await asyncio.to_thread(stripe.Price.list, lookup_keys=[lookup_key], active=True, limit=1)
    existing = _stripe_object_dict(prices).get("data") or []
    if existing:
        return existing[0]["id"]
    price_data = dict(checkout_price_data)
    product_data = price_data.pop("product_data")
    product_id = f"prod_civicsign_{fingerprint}"
    try:
        await asyncio.to_thread(stripe.Product.retrieve, product_id)
    except stripe.error.InvalidRequestError as exc:
        if getattr(exc, "code", None) != "resource_missing":
            raise
        await asyncio.to_thread(
            stripe.Product.create, id=product_id, **product_data,
            idempotency_key=f"product_{fingerprint}",
        )
    price = await asyncio.to_thread(
        stripe.Price.create, product=product_id, **price_data,
        lookup_key=lookup_key, idempotency_key=f"price_{fingerprint}",
    )
    return price["id"]


def _parse_invoice_preview(invoice) -> dict:
    """Extract proration credit/charge breakdown from a Stripe invoice preview."""
    data = _stripe_object_dict(invoice)
    lines = (data.get("lines") or {}).get("data") or []
    credit_cents = 0
    charge_cents = 0
    credit_lines: list[dict] = []
    charge_lines: list[dict] = []
    for line in lines:
        if not isinstance(line, dict):
            line = _stripe_object_dict(line)
        amount = int(line.get("amount") or 0)
        parent = line.get("parent") or {}
        details = parent.get("subscription_item_details") or {}
        if not (line.get("proration") or details.get("proration")):
            continue
        desc = (line.get("description") or "Proration").strip()
        if amount < 0:
            credit_cents += abs(amount)
            credit_lines.append({"description": desc, "amount": round(abs(amount) / 100, 2)})
        elif amount > 0:
            charge_cents += amount
            charge_lines.append({"description": desc, "amount": round(amount / 100, 2)})
    amount_due_cents = int(data.get("amount_due") or 0)
    sub_ends = data.get("subscription_proration_date") or data.get("period_end")
    period_end_iso = None
    if sub_ends:
        try:
            period_end_iso = datetime.fromtimestamp(int(sub_ends), tz=timezone.utc).isoformat()
        except (TypeError, ValueError, OSError):
            period_end_iso = None
    return {
        "credit": round(credit_cents / 100, 2),
        "charge": round(charge_cents / 100, 2),
        "amount_due": round(amount_due_cents / 100, 2),
        "currency": (data.get("currency") or CURRENCY).lower(),
        "credit_lines": credit_lines,
        "charge_lines": charge_lines,
        "period_end": period_end_iso,
        "requires_payment": amount_due_cents > 0,
    }


async def _preview_plan_upgrade(user: dict, plan_id: str, billing_interval: str) -> dict:
    """Preview unused Pro credit and extra Business charge for the rest of this billing cycle."""
    sub_id = user.get("stripe_subscription_id")
    customer_id = user.get("stripe_customer_id")
    if not sub_id or not customer_id:
        raise HTTPException(status_code=400, detail="No active subscription to upgrade.")

    current_plan = (user.get("plan") or "free").lower().strip()
    current_interval = (user.get("billing_interval") or "monthly").lower().strip()
    _require_stripe_key()
    try:
        items_param, _discounts = await _build_subscription_modify_items(sub_id, plan_id, billing_interval)
        preview = await asyncio.to_thread(
            stripe.Invoice.create_preview,
            customer=customer_id,
            subscription=sub_id,
            subscription_details={
                "items": items_param,
                "proration_behavior": "create_prorations",
                "billing_cycle_anchor": "unchanged" if current_interval == billing_interval else "now",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] upgrade preview failed for {sub_id}: {e}")
        raise HTTPException(status_code=502, detail="Could not calculate your upgrade total. Please try again.")

    breakdown = _parse_invoice_preview(preview)
    target_tax = tax_breakdown(_plan_amount(plan_id, billing_interval))
    return {
        "current_plan": current_plan,
        "current_interval": current_interval,
        "target_plan": plan_id,
        "target_interval": billing_interval,
        "target_plan_name": PLANS[plan_id]["name"],
        "current_plan_name": PLANS.get(current_plan, {}).get("name", current_plan.title()),
        "renewal_amount_inc_vat": target_tax["amount_inc_vat"],
        **breakdown,
    }


async def _verify_upgrade_invoice_payment(invoice_id: str) -> dict:
    """Verify with Stripe that a proration invoice is actually paid before granting access."""
    inv = await asyncio.to_thread(stripe.Invoice.retrieve, invoice_id)
    inv_dict = _stripe_object_dict(inv)
    status = (inv_dict.get("status") or "").lower()
    if status == "draft":
        inv = await asyncio.to_thread(stripe.Invoice.finalize_invoice, invoice_id)
        inv_dict = _stripe_object_dict(inv)
        status = (inv_dict.get("status") or "").lower()

    amount_due_cents = int(inv_dict.get("amount_due") or 0)
    total_cents = int(inv_dict.get("total") or 0)

    # Only trust Stripe invoice status — never assume paid by default.
    if status == "paid" and amount_due_cents <= 0:
        return {
            "paid": True,
            "amount_due": 0.0,
            "url": None,
            "invoice_id": invoice_id,
        }

    # Net credit covers the upgrade (rare on tier upgrades).
    if total_cents <= 0 and amount_due_cents <= 0 and status in ("paid", "void"):
        return {
            "paid": True,
            "amount_due": 0.0,
            "url": None,
            "invoice_id": invoice_id,
        }

    hosted_url = inv_dict.get("hosted_invoice_url")
    if amount_due_cents > 0 and not hosted_url:
        inv = await asyncio.to_thread(stripe.Invoice.retrieve, invoice_id)
        inv_dict = _stripe_object_dict(inv)
        hosted_url = inv_dict.get("hosted_invoice_url")

    if amount_due_cents > 0:
        if not hosted_url:
            logger.error(f"[billing] upgrade invoice {invoice_id} due but no hosted URL")
            raise HTTPException(
                status_code=502,
                detail="Could not open the secure payment page for your upgrade. Please try again.",
            )
        return {
            "paid": False,
            "amount_due": round(amount_due_cents / 100, 2),
            "url": hosted_url,
            "invoice_id": invoice_id,
        }

    # open / uncollectible with nothing clearly paid — do not grant the upgrade
    logger.warning(f"[billing] upgrade invoice {invoice_id} status={status} amount_due={amount_due_cents}")
    return {
        "paid": False,
        "amount_due": round(max(amount_due_cents, total_cents) / 100, 2),
        "url": hosted_url,
        "invoice_id": invoice_id,
    }


async def _record_upgrade_transaction(
    user: dict,
    plan_id: str,
    billing_interval: str,
    *,
    invoice_id: str | None,
    preview: dict,
    payment_status: str = "pending",
) -> str:
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    charge_ex_vat = _plan_amount(plan_id, billing_interval)
    tax = tax_breakdown(charge_ex_vat)
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "invoice_id": invoice_id,
        "user_id": user["user_id"],
        "email": user.get("email"),
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "purchase_type": "plan_upgrade",
        "from_plan": preview.get("current_plan"),
        "proration_credit": preview.get("credit"),
        "proration_charge": preview.get("charge"),
        "amount_ex_vat": charge_ex_vat,
        "vat_amount": tax["vat_amount"],
        "amount": preview.get("amount_due") or tax["amount_inc_vat"],
        "currency": CURRENCY,
        "status": "initiated",
        "payment_status": payment_status,
        "processed": payment_status == "paid",
        "created_at": _now(),
        "updated_at": _now(),
    })
    return tx_id


async def _execute_paid_upgrade(user: dict, plan_id: str, billing_interval: str, preview: dict, origin: str) -> dict:
    """Apply a prorated upgrade and collect any extra payment due today."""
    sub_id = user.get("stripe_subscription_id")
    items_param, discounts = await _build_subscription_modify_items(sub_id, plan_id, billing_interval)
    metadata = {
        "user_id": user["user_id"],
        "email": user.get("email") or "",
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "source": "civicsign_subscription_upgrade",
        "from_plan": preview.get("current_plan"),
    }
    modify_kwargs = {
        "items": items_param,
        "proration_behavior": "always_invoice",
        "payment_behavior": "pending_if_incomplete",
        "metadata": metadata,
    }
    if preview.get("current_interval") != billing_interval:
        modify_kwargs["billing_cycle_anchor"] = "now"
    if discounts:
        modify_kwargs["discounts"] = discounts

    updated = await asyncio.to_thread(stripe.Subscription.modify, sub_id, **modify_kwargs)
    updated_dict = _stripe_object_dict(updated)
    invoice_id = updated_dict.get("latest_invoice")
    if not invoice_id:
        logger.error(f"[billing] upgrade for {user['user_id']} produced no invoice")
        raise HTTPException(
            status_code=502,
            detail="Could not create an upgrade invoice. Please try again or contact support.",
        )

    # Always verify payment with Stripe — never activate on preview alone.
    payment = await _verify_upgrade_invoice_payment(invoice_id)
    if payment["paid"]:
        await asyncio.to_thread(stripe.Subscription.modify, sub_id, cancel_at_period_end=False)
    sub_status = (updated_dict.get("status") or "").lower()
    if not payment["paid"] and sub_status in ("incomplete", "past_due", "unpaid"):
        logger.info(
            f"[billing] upgrade for {user['user_id']} awaiting payment "
            f"(sub={sub_status}, invoice={invoice_id})"
        )

    tx_id = await _record_upgrade_transaction(
        user,
        plan_id,
        billing_interval,
        invoice_id=invoice_id,
        preview=preview,
        payment_status="paid" if payment["paid"] else "pending",
    )

    if payment["paid"]:
        await _activate_subscription(
            user["user_id"],
            plan_id,
            subscription_id=sub_id,
            customer_id=user.get("stripe_customer_id") or updated_dict.get("customer"),
            billing_interval=billing_interval,
            subscription_status=updated_dict.get("status") or "active",
            period_end_iso=_sub_period_end_iso(updated_dict),
        )
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {
                "$set": {"subscription_cancel_at_period_end": False, "updated_at": _now()},
                "$unset": {"pending_plan_upgrade": ""},
            },
        )
        await billing_emails.notify_plan_upgrade(
            user,
            plan_id=plan_id,
            billing_interval=billing_interval,
            dedupe_key=f"upgrade_invoice_{invoice_id}",
            previous_plan=preview.get("current_plan"),
            credit_gbp=preview.get("credit"),
        )
        plan_name = PLANS[plan_id]["name"]
        msg = f"Your plan is now {plan_name} ({billing_interval})."
        if preview.get("credit", 0) > 0:
            msg = (
                f"Upgraded to {plan_name}. We credited £{preview['credit']:.2f} for unused "
                f"{preview.get('current_plan_name', 'plan')} time this cycle."
            )
        return {
            "changed": True,
            "plan_id": plan_id,
            "billing_interval": billing_interval,
            "tx_id": tx_id,
            "message": msg,
            "preview": preview,
        }

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "pending_plan_upgrade": {
                "plan_id": plan_id,
                "billing_interval": billing_interval,
                "invoice_id": payment.get("invoice_id"),
                "tx_id": tx_id,
                "preview": preview,
                "created_at": _now(),
            },
            "updated_at": _now(),
        }},
    )
    return {
        "payment_required": True,
        "url": payment.get("url"),
        "amount_due": payment.get("amount_due"),
        "tx_id": tx_id,
        "preview": preview,
        "message": (
            f"Pay £{payment['amount_due']:.2f} to finish upgrading to {PLANS[plan_id]['name']}. "
            f"Includes credit for unused {preview.get('current_plan_name', 'plan')} time this billing cycle."
        ),
    }


async def _link_subscription_to_user(user_id: str, sub_id: str | None, cust_id: str | None) -> None:
    if not user_id or not sub_id:
        return
    # Store the identity first for reconciliation, but never invent active status
    # when Stripe is unavailable. The refresh also records the billing deadline.
    patch = {
        "stripe_subscription_id": sub_id,
        "subscription_status": "incomplete",
        "updated_at": _now(),
    }
    patch["subscription_trial_used"] = True
    if cust_id:
        patch["stripe_customer_id"] = cust_id
    await db.users.update_one({"user_id": user_id}, {"$set": patch})
    await _refresh_subscription_state(sub_id)


async def _change_subscription_plan(user: dict, plan_id: str, billing_interval: str) -> dict:
    """Downgrade or lateral plan change on an existing Stripe subscription."""
    previous_plan = (user.get("plan") or "free").lower().strip()
    previous_interval = (user.get("billing_interval") or "monthly").lower().strip()
    sub_id = user.get("stripe_subscription_id")
    status = (user.get("subscription_status") or "").lower()
    if not sub_id or status not in ACTIVE_SUBSCRIPTION_STATES:
        raise HTTPException(
            status_code=400,
            detail="No active subscription found. Use checkout to subscribe first.",
        )

    _require_stripe_key()
    try:
        items_param, discounts = await _build_subscription_modify_items(sub_id, plan_id, billing_interval)
        metadata = {
            "user_id": user["user_id"],
            "email": user.get("email") or "",
            "plan_id": plan_id,
            "billing_interval": billing_interval,
            "source": "civicsign_subscription_change",
        }
        modify_kwargs = {
            "items": items_param,
            "proration_behavior": "create_prorations",
            "metadata": metadata,
            "cancel_at_period_end": False,
        }
        if discounts:
            modify_kwargs["discounts"] = discounts
        updated = await asyncio.to_thread(stripe.Subscription.modify, sub_id, **modify_kwargs)
        updated_dict = _stripe_object_dict(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] subscription change failed for {sub_id}: {e}")
        raise HTTPException(
            status_code=502,
            detail="Could not change your plan. Try again or open billing portal.",
        )

    await _activate_subscription(
        user["user_id"],
        plan_id,
        subscription_id=sub_id,
        customer_id=user.get("stripe_customer_id") or updated_dict.get("customer"),
        billing_interval=billing_interval,
        subscription_status=updated_dict.get("status") or "active",
        period_end_iso=_sub_period_end_iso(updated_dict),
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"subscription_cancel_at_period_end": False, "updated_at": _now()},
            "$unset": {"pending_plan_upgrade": ""},
        },
    )
    dedupe_key = f"change_{sub_id}_{plan_id}_{billing_interval}"
    if _is_paid_upgrade(previous_plan, previous_interval, plan_id, billing_interval):
        await billing_emails.notify_plan_upgrade(
            user,
            plan_id=plan_id,
            billing_interval=billing_interval,
            dedupe_key=dedupe_key,
            previous_plan=previous_plan,
        )
    else:
        await billing_emails.notify_plan_downgrade(
            user,
            plan_id=plan_id,
            billing_interval=billing_interval,
            dedupe_key=dedupe_key,
            previous_plan=previous_plan,
            effective="immediate",
        )
    plan_name = PLANS[plan_id]["name"]
    return {
        "changed": True,
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "subscription_id": sub_id,
        "message": f"Your plan is now {plan_name} ({billing_interval}).",
    }


async def _apply_plan_upgrade(session_id: str, payment_status: str, status: str):
    """
    Idempotently update a transaction and fulfil checkout (plan upgrade or credits).

    Uses find_one_and_update to atomically claim the `processed` flag so
    concurrent webhook + status-poll cannot double-apply.
    """
    now_ts = _now()

    if payment_status != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status, "status": status, "updated_at": now_ts}},
        )
        return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})

    # Atomically claim this paid session (only one caller wins).
    tx = await db.payment_transactions.find_one_and_update(
        {"session_id": session_id, "processed": False},
        {"$set": {
            "processed": True,
            "payment_status": payment_status,
            "status": status,
            "updated_at": now_ts,
        }},
        return_document=ReturnDocument.BEFORE,
    )
    if not tx:
        existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if existing:
            logger.info(f"[billing] session {session_id} already processed, skipping")
        else:
            logger.warning(f"[billing] no transaction for session {session_id}")
        return existing

    user_id = tx.get("user_id")
    if not user_id:
        logger.error(f"[billing] missing user_id for session {session_id}")
        return tx

    user_before = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "email": 1, "name": 1, "plan": 1, "billing_interval": 1, "user_id": 1},
    )
    previous_plan = (user_before or {}).get("plan")

    purchase_type = tx.get("purchase_type", "plan")
    if purchase_type == "extra_document":
        credits = int(tx.get("document_credits") or 1)
        await _apply_document_credits(user_id, credits, session_id)
        return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})

    plan_id = tx.get("plan_id")
    if not plan_id:
        logger.error(f"[billing] missing plan_id for session {session_id}")
        return tx

    if plan_id not in PLANS:
        logger.error(f"[billing] invalid plan_id {plan_id} for session {session_id}")
        return tx

    billing_interval = (tx.get("billing_interval") or "monthly").lower().strip()
    if billing_interval not in ("monthly", "yearly"):
        billing_interval = "monthly"
    plan_sig = _generate_plan_signature(user_id, plan_id, now_ts)
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "plan": plan_id,
            "plan_updated_at": now_ts,
            "plan_signature": plan_sig,
            "plan_upgraded_via_payment": True,
            "billing_interval": billing_interval,
        }},
    )
    if result.matched_count == 0:
        logger.error(f"[billing] user {user_id} not found for plan upgrade")
        return tx

    logger.info(
        f"[billing] upgraded user={user_id} -> plan={plan_id} "
        f"(session {session_id}) with signature verification"
    )
    if user_before:
        await billing_emails.notify_plan_upgrade(
            user_before,
            plan_id=plan_id,
            billing_interval=billing_interval,
            dedupe_key=f"upgrade_session_{session_id}",
            previous_plan=previous_plan if previous_plan in PLANS else None,
        )
    return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})


@billing_router.get("/billing/trial-status")
async def billing_trial_status(user: dict = Depends(get_current_user)):
    """Per-account trial eligibility — one free trial per CivicSign account."""
    trial_days, trial_already_redeemed = await _resolve_checkout_trial(user)
    return {
        "subscription_trial_days": STRIPE_SUBSCRIPTION_TRIAL_DAYS,
        "subscription_trial_enabled": STRIPE_SUBSCRIPTION_TRIAL_DAYS > 0,
        "trial_eligible": bool(trial_days),
        "trial_already_redeemed": trial_already_redeemed,
    }


@billing_router.get("/billing/config")
async def billing_config():
    """Public billing config — lets the UI show live vs test and checkout readiness."""
    api_key = os.environ.get("STRIPE_API_KEY", "").strip()
    mode = _stripe_key_mode(api_key)
    live_required = _production_requires_live()
    webhook_set = bool(os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip())
    ready = bool(api_key and webhook_set and (mode == "live" or not live_required))
    payments_blocked = live_required and mode != "live"
    return {
        "currency": CURRENCY,
        "stripe_configured": bool(api_key),
        "stripe_mode": mode,
        "stripe_live_required": live_required,
        "payments_blocked": payments_blocked,
        "checkout_ready": ready and not payments_blocked,
        "promotion_codes_enabled": True,
        "subscription_trial_days": STRIPE_SUBSCRIPTION_TRIAL_DAYS,
        "subscription_trial_enabled": STRIPE_SUBSCRIPTION_TRIAL_DAYS > 0,
        "brand_primary": STRIPE_BRAND_PRIMARY,
        "brand_accent": STRIPE_BRAND_ACCENT,
    }


@billing_router.get("/billing/plans")
async def list_plans():
    """Public plan catalogue (amounts come from the server, excluding VAT)."""
    extra_tax = tax_breakdown(EXTRA_DOCUMENT_PRICE_GBP)
    return {
        "currency": CURRENCY,
        "prices_exclude_vat": True,
        "tax": {
            "name": "VAT",
            "rate": tax_breakdown(1.0)["vat_rate"],
            "percent": UK_VAT_PERCENT,
        },
        "extra_document_price": EXTRA_DOCUMENT_PRICE_GBP,
        "extra_document_tax": extra_tax,
        "yearly_months_paid": YEARLY_MONTHS_PAID,
        "plans": [
            {
                "id": pid,
                "name": p["name"],
                "amount_monthly": p["amount_monthly"],
                "amount_yearly": p["amount_yearly"],
                "tax_monthly": tax_breakdown(p["amount_monthly"]),
                "tax_yearly": tax_breakdown(p["amount_yearly"]),
            }
            for pid, p in PLANS.items()
        ],
    }


@billing_router.post("/billing/checkout")
@limiter.limit("12/hour")
async def create_checkout(body: CheckoutRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    """Create a Stripe checkout session for plan upgrade."""
    if is_organisation_member(user):
        raise HTTPException(
            status_code=400,
            detail="Organisation plans are managed by your account manager, not self-serve checkout.",
        )

    plan_id = (body.plan_id or "").lower().strip()
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Choose a paid plan to upgrade.")

    billing_interval = (body.billing_interval or "monthly").lower().strip()
    current_plan = (user.get("plan") or "free").lower().strip()
    current_interval = (user.get("billing_interval") or "monthly").lower().strip()
    if current_plan == plan_id and billing_interval == current_interval:
        raise HTTPException(status_code=400, detail=f"You are already on the {PLANS[plan_id]['name']} plan.")

    sub_id = user.get("stripe_subscription_id")
    sub_status = (user.get("subscription_status") or "").lower()
    if sub_id and sub_status in ACTIVE_SUBSCRIPTION_STATES:
        if _is_paid_upgrade(current_plan, current_interval, plan_id, billing_interval):
            preview = await _preview_plan_upgrade(user, plan_id, billing_interval)
            return {"upgrade_confirmation_required": True, "preview": preview}
        return await _change_subscription_plan(user, plan_id, billing_interval)

    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    trial_days, trial_already_redeemed = await _resolve_checkout_trial(user)
    line_items, discounts, amount_ex_vat = await _stripe_subscription_checkout_payload(
        plan_id, billing_interval, trial_days=trial_days,
    )
    tax = tax_breakdown(amount_ex_vat)
    amount = tax["amount_inc_vat"]
    success_url = f"{origin}/settings?tab=subscription&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/settings?tab=subscription"
    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "source": "civicsign_subscription",
    }
    if trial_days:
        metadata["trial_days"] = str(trial_days)

    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    _require_stripe_key()
    try:
        customer_id = await _get_or_create_customer(user)
        subscription_data: dict = {"metadata": metadata}
        if trial_days:
            subscription_data["trial_period_days"] = trial_days
        session_kwargs = {
            "mode": "subscription",
            "customer": customer_id,
            "client_reference_id": user["user_id"],
            "line_items": line_items,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": metadata,
            "subscription_data": subscription_data,
            "idempotency_key": f"checkout_{tx_id}",
            **_checkout_session_extras(
                mode="subscription",
                allow_promo_codes=not discounts,
                trial_days=trial_days,
            ),
        }
        if discounts:
            session_kwargs["discounts"] = discounts
        session = await asyncio.to_thread(stripe.checkout.Session.create, **session_kwargs)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] create_checkout_session failed: {e}")
        raise HTTPException(status_code=502, detail=_stripe_checkout_error_detail(e))

    # Create idempotent transaction record
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "session_id": session.id,
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "amount_ex_vat": amount_ex_vat,
        "vat_amount": tax["vat_amount"],
        "amount": amount,
        "currency": CURRENCY,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "processed": False,
        "created_at": _now(),
        "updated_at": _now(),
    })

    return {
        "url": session.url,
        "session_id": session.id,
        "tx_id": tx_id,
        "trial_days": trial_days or 0,
        "trial_eligible": bool(trial_days),
        "trial_already_redeemed": trial_already_redeemed,
    }


@billing_router.post("/billing/upgrade-preview")
@limiter.limit("30/hour")
async def upgrade_preview(body: UpgradeConfirmRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    """Preview prorated credit (unused Pro time) and extra due when upgrading mid-cycle."""
    if is_organisation_member(user):
        raise HTTPException(status_code=400, detail="Organisation plans are managed by your account manager.")
    plan_id = (body.plan_id or "").lower().strip()
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Choose a valid plan.")
    billing_interval = (body.billing_interval or "monthly").lower().strip()
    current_plan = (user.get("plan") or "free").lower().strip()
    current_interval = (user.get("billing_interval") or "monthly").lower().strip()
    if not _is_paid_upgrade(current_plan, current_interval, plan_id, billing_interval):
        raise HTTPException(status_code=400, detail="This change does not require a prorated upgrade payment.")
    preview = await _preview_plan_upgrade(user, plan_id, billing_interval)
    return {"preview": preview}


@billing_router.post("/billing/confirm-upgrade")
@limiter.limit("12/hour")
async def confirm_upgrade(body: UpgradeConfirmRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    """Confirm a prorated upgrade (e.g. Pro → Business) and pay any extra due today."""
    if is_organisation_member(user):
        raise HTTPException(status_code=400, detail="Organisation plans are managed by your account manager.")
    plan_id = (body.plan_id or "").lower().strip()
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Choose a valid plan.")
    billing_interval = (body.billing_interval or "monthly").lower().strip()
    current_plan = (user.get("plan") or "free").lower().strip()
    current_interval = (user.get("billing_interval") or "monthly").lower().strip()
    if current_plan == plan_id and billing_interval == current_interval:
        raise HTTPException(status_code=400, detail=f"You are already on the {PLANS[plan_id]['name']} plan.")
    if not _is_paid_upgrade(current_plan, current_interval, plan_id, billing_interval):
        return await _change_subscription_plan(user, plan_id, billing_interval)

    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    preview = await _preview_plan_upgrade(user, plan_id, billing_interval)
    _require_stripe_key()
    try:
        result = await _execute_paid_upgrade(user, plan_id, billing_interval, preview, origin)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] confirm_upgrade failed for {user['user_id']}: {e}")
        raise HTTPException(status_code=502, detail="Could not complete your upgrade. Please try again.")
    if result.get("changed"):
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        result["user"] = _public_user(fresh) if fresh else None
    return result


@billing_router.post("/billing/checkout-document")
@limiter.limit("30/hour")
async def create_document_checkout(body: DocumentCheckoutRequest, request: Request,
                                 user: dict = Depends(get_current_user)):
    """One-time Stripe checkout for extra document credits (80p each)."""
    if is_organisation_member(user):
        raise HTTPException(
            status_code=400,
            detail="Organisation document limits are managed by your account manager.",
        )

    quantity = int(body.quantity or 1)
    amount_ex_vat = round(EXTRA_DOCUMENT_PRICE_GBP * quantity, 2)
    tax = tax_breakdown(amount_ex_vat)
    amount = tax["amount_inc_vat"]
    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    success_url = f"{origin}/settings?tab=subscription&session_id={{CHECKOUT_SESSION_ID}}&purchase=document"
    cancel_url = f"{origin}/usage"
    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "purchase_type": "extra_document",
        "document_credits": str(quantity),
        "source": "civicsign_extra_document",
    }

    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    _require_stripe_key()
    try:
        customer_id = await _get_or_create_customer(user)
        doc_product = (
            "CivicSign extra document"
            if quantity == 1
            else f"CivicSign extra documents ({quantity})"
        )
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment",
            customer=customer_id,
            client_reference_id=user["user_id"],
            line_items=_stripe_line_items(doc_product, EXTRA_DOCUMENT_PRICE_GBP, quantity=quantity),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            idempotency_key=f"doc_{tx_id}",
            **_checkout_session_extras(mode="payment"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] create_document_checkout failed: {e}")
        raise HTTPException(status_code=502, detail=_stripe_checkout_error_detail(e))
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "session_id": session.id,
        "user_id": user["user_id"],
        "email": user["email"],
        "purchase_type": "extra_document",
        "document_credits": quantity,
        "amount_ex_vat": amount_ex_vat,
        "vat_amount": tax["vat_amount"],
        "amount": amount,
        "currency": CURRENCY,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "processed": False,
        "created_at": _now(),
        "updated_at": _now(),
    })

    return {"url": session.url, "session_id": session.id, "tx_id": tx_id, "credits": quantity}


@billing_router.get("/billing/status/{session_id}")
@limiter.limit("10/minute")  # SECURITY: Rate limiting prevents brute force polling
async def checkout_status(session_id: str, request: Request,
                          user: dict = Depends(get_current_user)):
    """
    Check payment status for a checkout session.
    
    SECURITY:
    - Rate limited to prevent brute force
    - Verifies session ownership
    - Only trusts Stripe's actual status response
    """
    if not _valid_stripe_session_id(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    tx = await _load_checkout_transaction(session_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Payment session not found")
    
    # CRITICAL: Verify user owns this transaction
    if tx["user_id"] != user["user_id"]:
        logger.warning(
            f"[billing] unauthorized access attempt to session {session_id} "
            f"by user {user['user_id']} (belongs to {tx['user_id']})"
        )
        raise HTTPException(status_code=403, detail="This payment session belongs to another account")

    _require_stripe_key()
    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.retrieve,
            session_id,
            expand=["discounts.promotion_code", "discounts.coupon"],
        )
    except Exception as e:
        logger.error(f"[billing] get_checkout_status failed: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment status. Please try again.")

    _assert_session_user(session, user["user_id"])
    await _record_checkout_promo(session_id, session)

    # CRITICAL: Only apply upgrade if status truly shows "paid"
    # Never trust payment_status from user input - always re-verify with Stripe
    await _apply_plan_upgrade(session_id, session.payment_status, session.status)

    # Best-effort: capture payment refs so admin refunds can target subscription invoices.
    if session.payment_status == "paid":
        try:
            await capture_checkout_payment_refs(session_id, session=session)
        except Exception as _e:
            logger.warning(f"[billing] could not capture payment refs for {session_id}: {_e}")

    # For subscription checkouts, link the live subscription to the user so
    # future renewal / failure events resolve back to this account.
    try:
        sub_id = getattr(session, "subscription", None)
        cust_id = getattr(session, "customer", None)
        if sub_id and getattr(session, "mode", None) == "subscription":
            await _link_subscription_to_user(user["user_id"], sub_id, cust_id or user.get("stripe_customer_id"))
    except Exception as _e:
        logger.warning(f"[billing] could not link subscription for {session_id}: {_e}")

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    fresh_tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {
        "status": session.status,
        "payment_status": session.payment_status,
        "amount_total": session.amount_total,
        "currency": session.currency,
        "plan_id": fresh_tx.get("plan_id") if fresh_tx else tx.get("plan_id"),
        "purchase_type": (fresh_tx or tx).get("purchase_type", "plan"),
        "document_credits": (fresh_tx or tx).get("document_credits"),
        "promotion_code": (fresh_tx or tx).get("promotion_code"),
        "promotion_discount": (fresh_tx or tx).get("promotion_discount"),
        "user": _public_user(fresh) if fresh else None,
    }


async def _complete_pending_upgrade_from_invoice(invoice_id: str, invoice_obj: dict) -> None:
    """Fulfill a pending prorated upgrade once Stripe confirms invoice payment."""
    if (invoice_obj.get("status") or "").lower() != "paid":
        return
    user = await db.users.find_one(
        {"pending_plan_upgrade.invoice_id": invoice_id},
        {"_id": 0},
    )
    if not user:
        return
    pending = user.get("pending_plan_upgrade") or {}
    plan_id = (pending.get("plan_id") or "").lower().strip()
    billing_interval = (pending.get("billing_interval") or "monthly").lower().strip()
    if plan_id not in PLANS:
        logger.warning(f"[billing] pending upgrade for {invoice_id} has invalid plan {plan_id}")
        return

    sub_id = user.get("stripe_subscription_id") or _invoice_subscription_id(invoice_obj)
    period_end_iso = None
    sub_status = "active"
    if sub_id:
        try:
            _require_stripe_key()
            subscription = await asyncio.to_thread(
                stripe.Subscription.modify, sub_id, cancel_at_period_end=False,
            )
            sub_dict = _stripe_object_dict(subscription)
            period_end_iso = _sub_period_end_iso(sub_dict)
            sub_status = sub_dict.get("status") or "active"
        except Exception as e:
            logger.warning(f"[billing] could not refresh subscription after upgrade invoice {invoice_id}: {e}")

    await _activate_subscription(
        user["user_id"],
        plan_id,
        subscription_id=sub_id,
        customer_id=user.get("stripe_customer_id"),
        billing_interval=billing_interval,
        subscription_status=sub_status,
        period_end_iso=period_end_iso,
    )
    now_ts = _now()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "subscription_cancel_at_period_end": False,
                "updated_at": now_ts,
            },
            "$unset": {"pending_plan_upgrade": ""},
        },
    )
    tx_id = pending.get("tx_id")
    if tx_id:
        await db.payment_transactions.update_one(
            {"tx_id": tx_id},
            {"$set": {
                "payment_status": "paid",
                "processed": True,
                "status": "complete",
                "updated_at": now_ts,
            }},
        )
    logger.info(f"[billing] completed pending upgrade to {plan_id} for {user['user_id']} (invoice {invoice_id})")
    pending_preview = pending.get("preview") or {}
    await billing_emails.notify_plan_upgrade(
        user,
        plan_id=plan_id,
        billing_interval=billing_interval,
        dedupe_key=f"upgrade_invoice_{invoice_id}",
        previous_plan=pending_preview.get("current_plan"),
        credit_gbp=pending_preview.get("credit"),
    )


async def _handle_invoice_upcoming(invoice: dict) -> None:
    """Send a renewal reminder ~7 days before Stripe takes payment."""
    sub_id = _invoice_subscription_id(invoice)
    customer_id = _stripe_resource_id(invoice.get("customer"))
    user = None
    if sub_id:
        user = await db.users.find_one({"stripe_subscription_id": sub_id}, {"_id": 0})
    if not user and customer_id:
        user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
    if not user:
        logger.info("[billing] invoice.upcoming: no matching user")
        return
    if user.get("subscription_cancel_at_period_end"):
        return
    status = (user.get("subscription_status") or "").lower()
    if status not in ACTIVE_SUBSCRIPTION_STATES:
        return
    plan_id = (user.get("plan") or "").lower().strip()
    if plan_id not in PLANS:
        return
    period_end = invoice.get("period_end") or invoice.get("next_payment_attempt")
    amount_due = invoice.get("amount_due")
    if amount_due is not None and int(amount_due) <= 0:
        return
    dedupe_key = f"renewal_{sub_id or customer_id}_{period_end}"
    await billing_emails.notify_renewal_reminder(
        user,
        plan_id=plan_id,
        billing_interval=user.get("billing_interval") or "monthly",
        amount_due_pence=amount_due,
        payment_date=period_end,
        dedupe_key=dedupe_key,
    )


@billing_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    
    CRITICAL SECURITY:
    - Verifies webhook signature cryptographically (prevents spoofing)
    - Only processes verified events
    - Validates event structure before processing
    """
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")

    # CRITICAL: Webhook signature is mandatory
    if not sig_header:
        logger.error("[billing] webhook received without Stripe-Signature header - rejecting")
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    _require_stripe_key()
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, get_webhook_secret())
    except Exception as e:
        logger.error(f"[billing] webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type")
    obj = event.get("data", {}).get("object") or {}

    # 1) Initial checkout completion (both one-time credits and first subscription payment).
    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        payment_status = obj.get("payment_status")
        if not payment_status:
            logger.warning("[billing] checkout webhook missing payment_status")
            raise HTTPException(status_code=400, detail="Invalid webhook event structure")
        if payment_status not in ("paid", "unpaid", "no_payment_required"):
            raise HTTPException(status_code=400, detail="Invalid payment status")
        if payment_status in ("paid", "no_payment_required"):
            tx = await _verify_webhook_checkout_session(obj)
            if tx:
                session_id = obj.get("id")
                await _apply_plan_upgrade(session_id, "paid", "complete")
                try:
                    full_session = await asyncio.to_thread(
                        stripe.checkout.Session.retrieve,
                        session_id,
                        expand=["discounts.promotion_code", "discounts.coupon"],
                    )
                    await _record_checkout_promo(session_id, full_session)
                except Exception as promo_err:
                    logger.warning(f"[billing] could not record promo for {session_id}: {promo_err}")
                sub_id, cust_id = obj.get("subscription"), obj.get("customer")
                if sub_id and obj.get("mode") == "subscription":
                    await _link_subscription_to_user(tx["user_id"], sub_id, cust_id)
                try:
                    await capture_checkout_payment_refs(session_id)
                except Exception as ref_err:
                    logger.warning(f"[billing] could not capture payment refs for {session_id}: {ref_err}")
                logger.info(f"[billing] webhook processed checkout {session_id}")
        return {"received": True}

    if event_type == "checkout.session.expired":
        session_id = obj.get("id")
        if _valid_stripe_session_id(session_id):
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "expired", "payment_status": "expired", "updated_at": _now()}},
            )
        return {"received": True}

    # 2) Subscription lifecycle — the gate that stops service when payment fails.
    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
    ):
        if obj.get("id"):
            await _refresh_subscription_state(obj["id"])
        return {"received": True}

    # 3) Plan refund — downgrade immediately (do not wait for billing period end).
    if event_type in ("charge.refunded", "refund.created"):
        await _handle_refund_event(obj)
        return {"received": True}

    # 4) Upcoming renewal — email ~7 days before payment (Stripe Dashboard default).
    if event_type == "invoice.upcoming":
        await _handle_invoice_upcoming(obj)
        return {"received": True}

    # 5) Prorated upgrade invoice paid — activate pending plan change.
    if event_type in ("invoice.payment_succeeded", "invoice.paid"):
        invoice_id = obj.get("id")
        if invoice_id:
            await _complete_pending_upgrade_from_invoice(invoice_id, obj)
        sub_id = _invoice_subscription_id(obj)
        if sub_id:
            await _refresh_subscription_state(sub_id)
        return {"received": True}

    # 6) Failed renewal — revoke immediately rather than waiting for the status sync.
    if event_type == "invoice.payment_failed":
        sub_id = _invoice_subscription_id(obj)
        if sub_id:
            await _refresh_subscription_state(sub_id)
        return {"received": True}

    # Acknowledge everything else.
    return {"received": True}


async def _get_or_create_retention_coupon() -> str:
    """50% off for one billing month — idempotent coupon id for retention offers."""
    env_id = os.environ.get("STRIPE_RETENTION_COUPON_ID")
    if env_id:
        return env_id
    _require_stripe_key()
    try:
        existing = await asyncio.to_thread(stripe.Coupon.retrieve, RETENTION_COUPON_ID)
        return existing.id
    except stripe.error.InvalidRequestError:
        pass
    coupon = await asyncio.to_thread(
        stripe.Coupon.create,
        id=RETENTION_COUPON_ID,
        percent_off=50,
        duration="repeating",
        duration_in_months=1,
        name="CivicSign retention — 50% off next month",
    )
    return coupon.id


async def _record_cancellation_feedback(user: dict, reason: str, feedback: str) -> None:
    reason = (reason or "").strip()[:200]
    feedback = (feedback or "").strip()[:2000]
    if not reason and not feedback:
        return
    await db.cancellation_feedback.insert_one({
        "feedback_id": f"cf_{uuid.uuid4().hex[:16]}",
        "user_id": user["user_id"],
        "email": user.get("email"),
        "plan": user.get("plan"),
        "reason": reason,
        "feedback": feedback,
        "created_at": _now(),
    })


@billing_router.post("/billing/retention-offer")
@limiter.limit("5/hour")
async def apply_retention_offer(request: Request, user: dict = Depends(get_current_user)):
    """Apply a one-time 50% discount on the subscriber's next billing month."""
    if is_organisation_member(user):
        raise HTTPException(
            status_code=400,
            detail="Organisation plans are managed by your account manager, not self-serve billing.",
        )
    plan = (user.get("plan") or "free").lower().strip()
    if plan not in PLANS or plan == "free":
        raise HTTPException(status_code=400, detail="No paid subscription to discount.")
    if user.get("retention_offer_used_at"):
        raise HTTPException(status_code=400, detail="Retention offer already used on this account.")

    sub_id = user.get("stripe_subscription_id")
    status = (user.get("subscription_status") or "").lower()
    now_ts = _now()
    patch = {
        "retention_offer_used_at": now_ts,
        "subscription_cancel_at_period_end": False,
        "updated_at": now_ts,
    }

    if sub_id and status in ACTIVE_SUBSCRIPTION_STATES:
        try:
            coupon_id = await _get_or_create_retention_coupon()
            subscription = await asyncio.to_thread(
                stripe.Subscription.modify,
                sub_id,
                discounts=[{"coupon": coupon_id}],
                cancel_at_period_end=False,
            )
            period_end = _sub_period_end_iso(dict(subscription))
            if period_end:
                patch["subscription_current_period_end"] = period_end
        except Exception as e:
            logger.error(f"[billing] retention_offer failed for {sub_id}: {e}")
            raise HTTPException(
                status_code=502,
                detail="Could not apply the retention discount. Please try again or contact support.",
            )
    else:
        logger.info(f"[billing] retention_offer recorded locally for user={user['user_id']} (no live Stripe sub)")

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "applied": True,
        "message": "50% off your next month has been applied. Thanks for staying with CivicSign!",
        "user": _public_user(fresh) if fresh else None,
    }


@billing_router.post("/billing/portal")
@limiter.limit("20/hour")
async def billing_portal(body: BillingPortalRequest, request: Request,
                         user: dict = Depends(get_current_user)):
    """Open Stripe Customer Portal for payment method, invoices, and cancellation."""
    if is_organisation_member(user):
        raise HTTPException(
            status_code=400,
            detail="Organisation plans are managed by your account manager, not self-serve billing.",
        )
    plan = (user.get("plan") or "free").lower().strip()
    if plan not in PLANS or plan == "free":
        raise HTTPException(status_code=400, detail="Subscribe to a paid plan before managing billing.")
    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    try:
        customer_id = await _resolve_stripe_customer(user)
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=customer_id,
            return_url=f"{origin}/settings?tab=subscription",
        )
    except stripe.error.InvalidRequestError as e:
        msg = str(e).lower()
        if "billing portal" in msg or "portal" in msg and "configuration" in msg:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Stripe Customer Portal is not configured yet. "
                    "Use Cancel subscription here, or enable the portal in Stripe Dashboard → Settings → Billing → Customer portal."
                ),
            )
        logger.error(f"[billing] billing_portal invalid request: {e}")
        raise HTTPException(status_code=502, detail="Could not open billing portal. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[billing] billing_portal failed for {user['user_id']}: {e}")
        raise HTTPException(
            status_code=502,
            detail="Could not open billing portal. Use Cancel subscription on this page instead.",
        )
    return {"url": session.url}


@billing_router.post("/billing/cancel")
@limiter.limit("10/hour")
async def cancel_subscription(
    request: Request,
    body: CancelSubscriptionRequest = CancelSubscriptionRequest(),
    user: dict = Depends(get_current_user),
):
    """Cancel the user's paid subscription.

    If a live Stripe subscription exists, schedule cancellation at the end of the
    paid period (access continues until then, then the webhook downgrades to free).
    Otherwise downgrade locally right away.
    """
    if is_organisation_member(user):
        raise HTTPException(
            status_code=400,
            detail="Organisation plans are managed by your account manager, not self-serve billing.",
        )

    await _record_cancellation_feedback(user, body.reason, body.feedback)

    sub_id = user.get("stripe_subscription_id")
    status = (user.get("subscription_status") or "").lower()
    api_key = os.environ.get("STRIPE_API_KEY", "").strip()

    async def _cancel_locally(reason: str) -> dict:
        await _downgrade_user_to_free(user["user_id"], reason=reason, subscription_status="canceled")
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return {
            "cancelled": True,
            "cancel_at_period_end": False,
            "message": "You're now on the Free plan.",
            "user": _public_user(fresh) if fresh else None,
        }

    if sub_id and status in ACTIVE_SUBSCRIPTION_STATES and api_key:
        # Cancellations must always work — do not block on live-key enforcement.
        _configure_stripe(enforce_live=False)
        try:
            try:
                existing = await asyncio.to_thread(stripe.Subscription.retrieve, sub_id)
                existing_dict = _stripe_object_dict(existing)
            except Exception as retrieve_err:
                if _stripe_subscription_missing(retrieve_err):
                    logger.warning(
                        f"[billing] cancel: subscription {sub_id} not in Stripe account "
                        f"({retrieve_err}) — downgrading {user['user_id']} locally"
                    )
                    return await _cancel_locally(
                        f"self-serve cancel (orphan subscription {sub_id})",
                    )
                raise

            existing_status = (existing_dict.get("status") or "").lower()
            if existing_dict.get("cancel_at_period_end"):
                period_end = _sub_period_end_iso(existing_dict)
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {
                        "subscription_cancel_at_period_end": True,
                        "subscription_current_period_end": period_end,
                        "updated_at": _now(),
                    }},
                )
                return {
                    "cancelled": True,
                    "cancel_at_period_end": True,
                    "current_period_end": period_end,
                    "message": "Cancellation is already scheduled for the end of your billing period.",
                }

            if existing_status in ("canceled", "incomplete_expired"):
                return await _cancel_locally(f"self-serve cancel (stripe status={existing_status})")

            subscription = await asyncio.to_thread(
                stripe.Subscription.modify, sub_id, cancel_at_period_end=True,
            )
            period_end = _sub_period_end_iso(_stripe_object_dict(subscription))
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "subscription_cancel_at_period_end": True,
                    "subscription_current_period_end": period_end,
                    "updated_at": _now(),
                }},
            )
            logger.info(f"[billing] scheduled cancellation for user={user['user_id']} sub={sub_id}")
            await billing_emails.notify_cancellation_scheduled(
                user,
                plan_id=(user.get("plan") or "pro").lower().strip(),
                billing_interval=user.get("billing_interval") or "monthly",
                period_end=period_end,
                dedupe_key=f"cancel_scheduled_{period_end}",
            )
            return {
                "cancelled": True,
                "cancel_at_period_end": True,
                "current_period_end": period_end,
                "message": "Your plan stays active until the end of the current billing period, then reverts to Free.",
            }
        except Exception as e:
            if _stripe_subscription_missing(e):
                logger.warning(f"[billing] cancel: missing subscription {sub_id}: {e}")
                return await _cancel_locally(f"self-serve cancel (missing subscription {sub_id})")
            logger.error(f"[billing] cancel_subscription failed for {sub_id}: {e}")
            # Do not leave the customer stuck on a paid plan when Stripe is unreachable.
            return await _cancel_locally(f"self-serve cancel (stripe error: {e})")

    # No Stripe subscription on file — downgrade immediately.
    return await _cancel_locally("self-serve cancel (no active subscription)")


@billing_router.get("/billing/user-plan-verify")
async def verify_user_plan(user: dict = Depends(get_current_user)):
    """
    Verify user's plan is valid and matches stored signature.
    
    This endpoint allows frontend to verify that plan hasn't been tampered with.
    """
    if is_organisation_member(user):
        return {
            "plan": "business",
            "verified": True,
            "message": "Organisation contract — full organisation feature set included",
        }

    user_plan = user.get("plan", "free")
    plan_sig = user.get("plan_signature")
    plan_updated_at = user.get("plan_updated_at")

    # Free plan doesn't require verification
    if user_plan == "free":
        return {
            "plan": user_plan,
            "verified": True,
            "message": "Free plan (no signature required)"
        }

    # Paid plans must have signature
    if not plan_sig or not plan_updated_at:
        logger.warning(
            f"[billing] user {user['user_id']} has paid plan but missing signature - "
            "plan may have been tampered with"
        )
        # Downgrade to free as failsafe
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"plan": "free", "plan_signature": None}}
        )
        return {
            "plan": "free",
            "verified": False,
            "message": "Plan verification failed - downgraded to free"
        }

    # Verify signature
    is_valid = _verify_plan_signature(user["user_id"], user_plan, plan_updated_at, plan_sig)
    
    if not is_valid:
        logger.error(
            f"[billing] plan signature verification FAILED for user {user['user_id']} - "
            "possible tampering detected!"
        )
        # Downgrade to free as failsafe
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"plan": "free", "plan_signature": None}}
        )
        return {
            "plan": "free",
            "verified": False,
            "message": "Plan signature invalid - downgraded to free as failsafe"
        }

    return {
        "plan": user_plan,
        "verified": True,
        "message": "Plan verified"
    }
