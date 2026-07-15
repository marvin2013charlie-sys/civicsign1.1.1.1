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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo import ReturnDocument
from rate_limits import limiter

import stripe

from db import db
from auth import get_current_user, _public_user
from security_utils import is_dev_mode, validate_redirect_base
from models import BillingPortalRequest, CancelSubscriptionRequest, CheckoutRequest, DocumentCheckoutRequest
from tax import UK_VAT_PERCENT, tax_breakdown

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


def _plan_amount(plan_id: str, billing_interval: str) -> float:
    plan = PLANS[plan_id]
    interval = (billing_interval or "monthly").lower().strip()
    if interval == "yearly":
        return float(plan["amount_yearly"])
    if interval != "monthly":
        raise HTTPException(status_code=400, detail="billing_interval must be monthly or yearly")
    return float(plan["amount_monthly"])


def _stripe_line_items(product_name: str, unit_ex_vat: float, quantity: int = 1) -> list:
    """Checkout line items: net price + separate VAT line (prices excl. tax)."""
    total_ex = round(float(unit_ex_vat) * quantity, 2)
    tax = tax_breakdown(total_ex)
    items = [
        {
            "price_data": {
                "currency": CURRENCY,
                "product_data": {"name": product_name},
                "unit_amount": int(round(unit_ex_vat * 100)),
            },
            "quantity": quantity,
        },
    ]
    if tax["vat_amount"] > 0:
        items.append({
            "price_data": {
                "currency": CURRENCY,
                "product_data": {"name": f"VAT ({UK_VAT_PERCENT}%)"},
                "unit_amount": int(round(tax["vat_amount"] * 100)),
            },
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
    product_data = {"name": product_name}
    if product_description:
        product_data["description"] = product_description
    items = [
        {
            "price_data": {
                "currency": CURRENCY,
                "product_data": product_data,
                "unit_amount": int(round(unit_ex_vat * 100)),
                "recurring": {"interval": interval},
            },
            "quantity": 1,
        },
    ]
    if tax["vat_amount"] > 0:
        items.append({
            "price_data": {
                "currency": CURRENCY,
                "product_data": {"name": f"VAT ({UK_VAT_PERCENT}%)"},
                "unit_amount": int(round(tax["vat_amount"] * 100)),
                "recurring": {"interval": interval},
            },
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


def _require_live_in_production(api_key: str) -> None:
    """Block test keys on production when STRIPE_REQUIRE_LIVE is enabled."""
    require_live = os.environ.get("STRIPE_REQUIRE_LIVE", "").lower() in ("1", "true", "yes")
    if not require_live or is_dev_mode():
        return
    if _stripe_key_mode(api_key) != "live":
        logger.error("[billing] production requires a live Stripe key (sk_live_...)")
        raise HTTPException(
            status_code=503,
            detail="Live payments are not configured yet. Contact support.",
        )


def _checkout_session_extras(*, mode: str) -> dict:
    """Emergent-style hosted checkout: UK address, clear CTA, subscription wording."""
    extras = {
        "locale": "en-GB",
        "billing_address_collection": "required",
        "customer_update": {"address": "auto", "name": "auto"},
        "payment_method_types": ["card"],
        "phone_number_collection": {"enabled": False},
        "custom_text": {
            "submit": {
                "message": "Pay and subscribe" if mode == "subscription" else "Pay securely",
            },
        },
    }
    if mode == "subscription":
        extras["submit_type"] = "subscribe"
    return extras


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


async def _stripe_subscription_checkout_payload(plan_id: str, billing_interval: str) -> tuple[list, list, float]:
    """Build line items for Emergent-style Stripe Checkout (clear titles + renewal note)."""
    plan = PLANS[plan_id]
    interval = (billing_interval or "monthly").lower().strip()
    charge_ex_vat = _plan_amount(plan_id, billing_interval)
    renewal_inc_vat = tax_breakdown(charge_ex_vat)["amount_inc_vat"]

    if interval == "yearly":
        list_ex_vat = float(plan["amount_monthly"]) * 12
        savings = _annual_savings_ex_vat(plan_id)
        product_name = f"Subscribe to CivicSign {plan['name']} Annual"
        product_description = (
            f"List £{list_ex_vat:.2f} excl. VAT · Annual plan discount −£{savings:.2f} "
            f"({12 - YEARLY_MONTHS_PAID} months free) · "
            f"Then £{renewal_inc_vat:.2f} per year incl. VAT"
        )
        line_items = _stripe_recurring_line_items(
            product_name,
            charge_ex_vat,
            billing_interval,
            product_description=product_description,
        )
        return line_items, [], charge_ex_vat

    product_name = f"Subscribe to CivicSign {plan['name']}"
    product_description = f"Then £{renewal_inc_vat:.2f} per month incl. VAT"
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


def _require_stripe_key() -> str:
    api_key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Billing is not configured")
    _require_live_in_production(api_key)
    stripe.api_key = api_key
    return api_key


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
    """Return the user's Stripe customer id, creating one if needed."""
    cid = user.get("stripe_customer_id")
    if cid:
        return cid
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


def _sub_period_end_iso(subscription: dict) -> str | None:
    ts = subscription.get("current_period_end") if isinstance(subscription, dict) else None
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


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
    result = await db.users.update_one({"user_id": user_id}, {"$set": patch})
    if result.matched_count == 0:
        logger.error(f"[billing] user {user_id} not found to activate subscription")
        return False
    logger.info(f"[billing] activated plan={plan_id} for user={user_id} (status={subscription_status})")
    return True


async def _downgrade_user_to_free(user_id: str, reason: str, subscription_status: str = "canceled") -> None:
    """Revoke paid access. Clearing plan_signature makes get_effective_plan()
    return 'free' everywhere, so quotas and features immediately revert."""
    now_ts = _now()
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "plan": "free",
                "plan_updated_at": now_ts,
                "plan_signature": None,
                "plan_upgraded_via_payment": False,
                "subscription_status": subscription_status,
                "subscription_cancel_at_period_end": False,
                "monthly_envelope_limit": None,
                "enterprise_unlimited": False,
                "updated_at": now_ts,
            },
            "$unset": {
                "stripe_subscription_id": "",
                "subscription_current_period_end": "",
            },
        },
    )
    logger.info(f"[billing] downgraded user={user_id} to free ({reason}, status={subscription_status})")


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
        )


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
        if amount_total is not None and expected_cents > 0 and int(amount_total) != expected_cents:
            logger.error(
                f"[billing] webhook amount mismatch session={session_id} "
                f"got={amount_total} expected={expected_cents}"
            )
            raise HTTPException(status_code=400, detail="Webhook amount mismatch")

    return tx


async def _link_subscription_to_user(user_id: str, sub_id: str | None, cust_id: str | None) -> None:
    if not user_id or not sub_id:
        return
    patch = {
        "stripe_subscription_id": sub_id,
        "subscription_status": "active",
        "updated_at": _now(),
    }
    if cust_id:
        patch["stripe_customer_id"] = cust_id
    await db.users.update_one({"user_id": user_id}, {"$set": patch})


async def _change_subscription_plan(user: dict, plan_id: str, billing_interval: str) -> dict:
    """Change plan on an existing Stripe subscription (avoids duplicate subscriptions)."""
    sub_id = user.get("stripe_subscription_id")
    status = (user.get("subscription_status") or "").lower()
    if not sub_id or status not in ACTIVE_SUBSCRIPTION_STATES:
        raise HTTPException(
            status_code=400,
            detail="No active subscription found. Use checkout to subscribe first.",
        )

    new_line_items, discounts, amount_ex_vat = await _stripe_subscription_checkout_payload(plan_id, billing_interval)

    _require_stripe_key()
    try:
        subscription = await asyncio.to_thread(stripe.Subscription.retrieve, sub_id)
        sub_dict = _stripe_object_dict(subscription)
        existing_items = (sub_dict.get("items") or {}).get("data") or []
        items_param = [{"id": item["id"], "deleted": True} for item in existing_items]
        for li in new_line_items:
            items_param.append({
                "price_data": li["price_data"],
                "quantity": li["quantity"],
            })
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
        {"$set": {"subscription_cancel_at_period_end": False, "updated_at": _now()}},
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
    return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})


@billing_router.get("/billing/config")
async def billing_config():
    """Public billing config — lets the UI show live vs test and checkout readiness."""
    api_key = os.environ.get("STRIPE_API_KEY", "").strip()
    mode = _stripe_key_mode(api_key)
    require_live = os.environ.get("STRIPE_REQUIRE_LIVE", "").lower() in ("1", "true", "yes")
    webhook_set = bool(os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip())
    ready = bool(api_key and webhook_set and (mode == "live" or not require_live or is_dev_mode()))
    return {
        "currency": CURRENCY,
        "stripe_configured": bool(api_key),
        "stripe_mode": mode,
        "stripe_live_required": require_live and not is_dev_mode(),
        "checkout_ready": ready,
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
        return await _change_subscription_plan(user, plan_id, billing_interval)

    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    line_items, discounts, amount_ex_vat = await _stripe_subscription_checkout_payload(plan_id, billing_interval)
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

    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    _require_stripe_key()
    try:
        customer_id = await _get_or_create_customer(user)
        session_kwargs = {
            "mode": "subscription",
            "customer": customer_id,
            "client_reference_id": user["user_id"],
            "line_items": line_items,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": metadata,
            "subscription_data": {"metadata": metadata},
            "idempotency_key": f"checkout_{tx_id}",
            **_checkout_session_extras(mode="subscription"),
        }
        if discounts:
            session_kwargs["discounts"] = discounts
        session = await asyncio.to_thread(stripe.checkout.Session.create, **session_kwargs)
    except Exception as e:
        logger.error(f"[billing] create_checkout_session failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout. Please try again.")

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

    return {"url": session.url, "session_id": session.id, "tx_id": tx_id}


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
    except Exception as e:
        logger.error(f"[billing] create_document_checkout failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout. Please try again.")
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
        session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
    except Exception as e:
        logger.error(f"[billing] get_checkout_status failed: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment status. Please try again.")

    _assert_session_user(session, user["user_id"])

    # CRITICAL: Only apply upgrade if status truly shows "paid"
    # Never trust payment_status from user input - always re-verify with Stripe
    await _apply_plan_upgrade(session_id, session.payment_status, session.status)

    # Best-effort: capture payment_intent on the tx so refunds can target it.
    try:
        pi = getattr(session, "payment_intent", None)
        if session.payment_status == "paid" and pi and not tx.get("payment_intent_id"):
            await db.payment_transactions.update_one(
                {"session_id": session_id}, {"$set": {"payment_intent_id": pi, "updated_at": _now()}}
            )
    except Exception as _e:
        logger.warning(f"[billing] could not capture payment_intent for {session_id}: {_e}")

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
        "user": _public_user(fresh) if fresh else None,
    }


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
                sub_id, cust_id = obj.get("subscription"), obj.get("customer")
                if sub_id and obj.get("mode") == "subscription":
                    await _link_subscription_to_user(tx["user_id"], sub_id, cust_id)
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
    ):
        await _handle_subscription_state(obj)
        return {"received": True}

    # 3) Plan refund — downgrade immediately (do not wait for billing period end).
    if event_type in ("charge.refunded", "refund.created"):
        await _handle_refund_event(obj)
        return {"received": True}

    # 4) Failed renewal — revoke immediately rather than waiting for the status sync.
    if event_type == "invoice.payment_failed":
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                subscription = await asyncio.to_thread(stripe.Subscription.retrieve, sub_id)
                await _handle_subscription_state(dict(subscription))
            except Exception as e:
                logger.error(f"[billing] could not process failed invoice for {sub_id}: {e}")
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
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail="No billing account on file. Contact support if you have an active subscription.",
        )
    origin = validate_redirect_base(
        body.origin_url or "",
        fallback=request.headers.get("origin", ""),
    )
    _require_stripe_key()
    try:
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=customer_id,
            return_url=f"{origin}/settings?tab=subscription",
        )
    except Exception as e:
        logger.error(f"[billing] billing_portal failed for {customer_id}: {e}")
        raise HTTPException(status_code=502, detail="Could not open billing portal. Please try again.")
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

    if sub_id and status in ACTIVE_SUBSCRIPTION_STATES:
        _require_stripe_key()
        try:
            subscription = await asyncio.to_thread(
                stripe.Subscription.modify, sub_id, cancel_at_period_end=True,
            )
        except Exception as e:
            logger.error(f"[billing] cancel_subscription failed for {sub_id}: {e}")
            raise HTTPException(status_code=502, detail="Could not cancel your subscription. Please try again.")
        period_end = _sub_period_end_iso(dict(subscription))
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_cancel_at_period_end": True,
                "subscription_current_period_end": period_end,
                "updated_at": _now(),
            }},
        )
        logger.info(f"[billing] scheduled cancellation for user={user['user_id']} sub={sub_id}")
        return {
            "cancelled": True,
            "cancel_at_period_end": True,
            "current_period_end": period_end,
            "message": "Your plan stays active until the end of the current billing period, then reverts to Free.",
        }

    # No live subscription — downgrade immediately.
    await _downgrade_user_to_free(user["user_id"], reason="self-serve cancel (no active subscription)", subscription_status="canceled")
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "cancelled": True,
        "cancel_at_period_end": False,
        "message": "You're now on the Free plan.",
        "user": _public_user(fresh) if fresh else None,
    }


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
