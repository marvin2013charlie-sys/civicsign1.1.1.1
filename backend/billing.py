"""Stripe billing for CIVICSIGN.

One-time Checkout charges for plan upgrades (Pro / Business) using the Emergent
Stripe Checkout wrapper. Prices are defined server-side ONLY and never trusted
from the client. Every attempt is recorded in `payment_transactions`, and plan
upgrades are applied idempotently (guarded by a `processed` flag) from either the
status-polling endpoint or the webhook.
"""
import os
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest,
)

from db import db
from auth import get_current_user, _public_user
from models import CheckoutRequest

logger = logging.getLogger("civicsign.billing")

billing_router = APIRouter(prefix="/api", tags=["billing"])

CURRENCY = "gbp"

# Server-side, fixed plan catalogue. The frontend NEVER sends amounts.
PLANS = {
    "pro": {"name": "Pro", "amount": 15.00},
    "business": {"name": "Business", "amount": 49.00},
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _get_checkout(request: Request) -> StripeCheckout:
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Billing is not configured")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


async def _apply_plan_upgrade(session_id: str, payment_status: str, status: str):
    """Idempotently update a transaction and upgrade the user's plan on success."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        logger.warning(f"[billing] no transaction for session {session_id}")
        return None

    updates = {"payment_status": payment_status, "status": status, "updated_at": _now()}

    # Only upgrade the plan once per paid session.
    if payment_status == "paid" and not tx.get("processed"):
        plan_id = tx.get("plan_id")
        if plan_id in PLANS:
            await db.users.update_one(
                {"user_id": tx["user_id"]},
                {"$set": {"plan": plan_id, "plan_updated_at": _now()}},
            )
        updates["processed"] = True
        logger.info(f"[billing] upgraded user={tx['user_id']} -> plan={plan_id} (session {session_id})")

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})
    return tx


@billing_router.get("/billing/plans")
async def list_plans():
    """Public plan catalogue (amounts come from the server)."""
    return {
        "currency": CURRENCY,
        "plans": [{"id": pid, "name": p["name"], "amount": p["amount"]} for pid, p in PLANS.items()],
    }


@billing_router.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, request: Request,
                          user: dict = Depends(get_current_user)):
    plan_id = (body.plan_id or "").lower().strip()
    if plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Choose a paid plan (Pro or Business) to upgrade.")
    if user.get("plan") == plan_id:
        raise HTTPException(status_code=400, detail=f"You are already on the {PLANS[plan_id]['name']} plan.")

    origin = (body.origin_url or "").rstrip("/")
    if not origin:
        raise HTTPException(status_code=400, detail="Missing origin URL")

    amount = float(PLANS[plan_id]["amount"])  # server-defined amount only
    success_url = f"{origin}/settings?tab=subscription&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/settings?tab=subscription"
    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "source": "civicsign_subscription",
    }

    stripe_checkout = _get_checkout(request)
    checkout_request = CheckoutSessionRequest(
        amount=amount, currency=CURRENCY,
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    except Exception as e:
        logger.error(f"[billing] create_checkout_session failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start checkout. Please try again.")

    await db.payment_transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:16]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "amount": amount,
        "currency": CURRENCY,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "processed": False,
        "created_at": _now(),
        "updated_at": _now(),
    })

    return {"url": session.url, "session_id": session.session_id}


@billing_router.get("/billing/status/{session_id}")
async def checkout_status(session_id: str, request: Request,
                          user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Payment session not found")
    if tx["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="This payment session belongs to another account")

    stripe_checkout = _get_checkout(request)
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"[billing] get_checkout_status failed: {e}")
        raise HTTPException(status_code=502, detail="Could not verify payment status. Please try again.")

    await _apply_plan_upgrade(session_id, status.payment_status, status.status)

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "plan_id": tx.get("plan_id"),
        "user": _public_user(fresh) if fresh else None,
    }


@billing_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("Stripe-Signature")
    stripe_checkout = _get_checkout(request)
    try:
        event = await stripe_checkout.handle_webhook(payload, sig)
    except Exception as e:
        logger.error(f"[billing] webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event.session_id:
        await _apply_plan_upgrade(event.session_id, event.payment_status, "complete")
    return {"received": True}
