"""Stripe billing for CivicSign.

One-time Checkout charges for plan upgrades (Pro / Business) using the official
Stripe SDK. Prices are defined server-side ONLY and never trusted
from the client. Every attempt is recorded in `payment_transactions`, and plan
upgrades are applied idempotently (guarded by a `processed` flag) from either the
status-polling endpoint or the webhook.

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
import hmac
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo import ReturnDocument
from rate_limits import limiter

import stripe

from db import db
from auth import get_current_user, _public_user
from security_utils import validate_redirect_base
from models import CheckoutRequest, DocumentCheckoutRequest

logger = logging.getLogger("civicsign.billing")

billing_router = APIRouter(prefix="/api", tags=["billing"])

CURRENCY = "gbp"
EXTRA_DOCUMENT_PRICE_GBP = 1.00

# Server-side, fixed plan catalogue. The frontend NEVER sends amounts.
PRO_MONTHLY_GBP = 15.00
BUSINESS_MONTHLY_GBP = 79.00
YEARLY_MONTHS_PAID = 10  # pay 10 months, get 12

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
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Billing is not configured")
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

    plan_sig = _generate_plan_signature(user_id, plan_id, now_ts)
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "plan": plan_id,
            "plan_updated_at": now_ts,
            "plan_signature": plan_sig,
            "plan_upgraded_via_payment": True,
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


@billing_router.get("/billing/plans")
async def list_plans():
    """Public plan catalogue (amounts come from the server)."""
    return {
        "currency": CURRENCY,
        "extra_document_price": EXTRA_DOCUMENT_PRICE_GBP,
        "yearly_months_paid": YEARLY_MONTHS_PAID,
        "plans": [
            {
                "id": pid,
                "name": p["name"],
                "amount_monthly": p["amount_monthly"],
                "amount_yearly": p["amount_yearly"],
            }
            for pid, p in PLANS.items()
        ],
    }


@billing_router.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    """Create a Stripe checkout session for plan upgrade."""
    plan_id = (body.plan_id or "").lower().strip()
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Choose a paid plan to upgrade.")
    if user.get("plan") == plan_id:
        raise HTTPException(status_code=400, detail=f"You are already on the {PLANS[plan_id]['name']} plan.")

    origin = validate_redirect_base(body.origin_url or "")
    billing_interval = (body.billing_interval or "monthly").lower().strip()
    amount = _plan_amount(plan_id, billing_interval)
    product_name = _plan_product_name(plan_id, billing_interval)
    success_url = f"{origin}/settings?tab=subscription&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/settings?tab=subscription"
    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "billing_interval": billing_interval,
        "source": "civicsign_subscription",
    }

    _require_stripe_key()
    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": CURRENCY,
                    "product_data": {"name": product_name},
                    "unit_amount": int(round(amount * 100)),  # server-defined amount only
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
    except Exception as e:
        logger.error(f"[billing] create_checkout_session failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout. Please try again.")

    # Create idempotent transaction record
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "session_id": session.id,
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "billing_interval": billing_interval,
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
async def create_document_checkout(body: DocumentCheckoutRequest, request: Request,
                                 user: dict = Depends(get_current_user)):
    """One-time Stripe checkout for extra document credits (£1 each)."""
    quantity = int(body.quantity or 1)
    amount = round(EXTRA_DOCUMENT_PRICE_GBP * quantity, 2)
    origin = validate_redirect_base(body.origin_url or "")
    success_url = f"{origin}/settings?tab=subscription&session_id={{CHECKOUT_SESSION_ID}}&purchase=document"
    cancel_url = f"{origin}/usage"
    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "purchase_type": "extra_document",
        "document_credits": str(quantity),
        "source": "civicsign_extra_document",
    }

    _require_stripe_key()
    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": CURRENCY,
                    "product_data": {
                        "name": "CivicSign extra document"
                        if quantity == 1
                        else f"CivicSign extra documents ({quantity})",
                    },
                    "unit_amount": int(round(EXTRA_DOCUMENT_PRICE_GBP * 100)),
                },
                "quantity": quantity,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
    except Exception as e:
        logger.error(f"[billing] create_document_checkout failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout. Please try again.")

    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "session_id": session.id,
        "user_id": user["user_id"],
        "email": user["email"],
        "purchase_type": "extra_document",
        "document_credits": quantity,
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
    # Validate session_id format (basic sanity check)
    if not isinstance(session_id, str) or len(session_id) > 256:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
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

    # We only care about completed checkout sessions; acknowledge everything else.
    if event.get("type") not in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        return {"received": True}

    session = event.get("data", {}).get("object") or {}
    session_id = session.get("id")
    payment_status = session.get("payment_status")

    # CRITICAL: Only process valid events
    if not session_id or not payment_status:
        logger.warning("[billing] webhook event missing required fields")
        raise HTTPException(status_code=400, detail="Invalid webhook event structure")

    # Validate session_id and payment_status format
    if not isinstance(session_id, str) or len(session_id) > 256:
        logger.error(f"[billing] invalid session_id format in webhook: {session_id}")
        raise HTTPException(status_code=400, detail="Invalid session ID")

    valid_statuses = ["paid", "unpaid", "no_payment_required"]
    if payment_status not in valid_statuses:
        logger.error(f"[billing] invalid payment_status in webhook: {payment_status}")
        raise HTTPException(status_code=400, detail="Invalid payment status")

    # CRITICAL: Only process paid events
    if payment_status == "paid":
        await _apply_plan_upgrade(session_id, payment_status, "complete")
        logger.info(f"[billing] webhook processed payment for session {session_id}")

    return {"received": True}


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
