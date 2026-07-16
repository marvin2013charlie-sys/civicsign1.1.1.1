"""Billing notification emails — upgrade/downgrade confirmations and renewal reminders."""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone

import email_service

logger = logging.getLogger("civicsign.billing.email")

PLAN_LABELS = {"pro": "Pro", "business": "Business", "free": "Free"}
INTERVAL_LABELS = {"monthly": "monthly", "yearly": "annual"}


def _settings_url() -> str:
    base = (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_SITE_URL")
        or "https://civicsign.co.uk"
    ).rstrip("/")
    return f"{base}/settings"


def _plan_label(plan_id: str) -> str:
    return PLAN_LABELS.get((plan_id or "").lower().strip(), (plan_id or "Free").capitalize())


def _interval_label(interval: str) -> str:
    return INTERVAL_LABELS.get((interval or "monthly").lower().strip(), interval or "monthly")


def _format_period_end(value) -> str | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        try:
            dt = datetime.fromtimestamp(int(value), tz=timezone.utc)
            return dt.strftime("%d %B %Y")
        except (TypeError, ValueError, OSError):
            return None
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.strftime("%d %B %Y")
        except ValueError:
            return value[:10] if len(value) >= 10 else value
    return None


def _format_gbp_amount(amount_pence: int | float | None) -> str | None:
    if amount_pence is None:
        return None
    try:
        return f"£{float(amount_pence) / 100:.2f}"
    except (TypeError, ValueError):
        return None


def _sanitize_dedupe_key(key: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in key)[:120]


async def _claim_billing_email(user_id: str, dedupe_key: str) -> bool:
    """Atomically claim a one-time billing email slot. Returns True if send should proceed."""
    import billing as _billing

    safe = _sanitize_dedupe_key(dedupe_key)
    now_iso = datetime.now(timezone.utc).isoformat()
    result = await _billing.db.users.update_one(
        {"user_id": user_id, f"billing_emails_sent.{safe}": {"$exists": False}},
        {"$set": {f"billing_emails_sent.{safe}": now_iso}},
    )
    modified = getattr(result, "modified_count", None)
    if modified is None:
        modified = getattr(result, "matched_count", 0)
    return modified > 0


async def _send_safe(fn, *args, **kwargs) -> None:
    try:
        await asyncio.to_thread(fn, *args, **kwargs)
    except Exception as exc:
        logger.warning(f"[billing-email] send failed: {exc}")


async def notify_plan_upgrade(
    user: dict,
    *,
    plan_id: str,
    billing_interval: str,
    dedupe_key: str,
    previous_plan: str | None = None,
    credit_gbp: float | None = None,
) -> None:
    email = (user.get("email") or "").strip()
    if not email:
        return
    if not await _claim_billing_email(user["user_id"], dedupe_key):
        return
    prev = _plan_label(previous_plan) if previous_plan else None
    await _send_safe(
        email_service.send_plan_upgrade_confirmation,
        email,
        user.get("name") or "",
        _plan_label(plan_id),
        _interval_label(billing_interval),
        _settings_url(),
        previous_plan_name=prev,
        credit_gbp=credit_gbp,
    )


async def notify_plan_downgrade(
    user: dict,
    *,
    plan_id: str,
    billing_interval: str,
    dedupe_key: str,
    previous_plan: str | None = None,
    effective: str = "immediate",
    period_end=None,
) -> None:
    email = (user.get("email") or "").strip()
    if not email:
        return
    if not await _claim_billing_email(user["user_id"], dedupe_key):
        return
    await _send_safe(
        email_service.send_plan_downgrade_confirmation,
        email,
        user.get("name") or "",
        _plan_label(plan_id),
        _interval_label(billing_interval),
        _settings_url(),
        previous_plan_name=_plan_label(previous_plan) if previous_plan else None,
        effective=effective,
        period_end_label=_format_period_end(period_end),
    )


async def notify_cancellation_scheduled(
    user: dict,
    *,
    plan_id: str,
    billing_interval: str,
    period_end,
    dedupe_key: str,
) -> None:
    email = (user.get("email") or "").strip()
    if not email:
        return
    if not await _claim_billing_email(user["user_id"], dedupe_key):
        return
    await _send_safe(
        email_service.send_subscription_cancellation_scheduled,
        email,
        user.get("name") or "",
        _plan_label(plan_id),
        _interval_label(billing_interval),
        _format_period_end(period_end) or "the end of your billing period",
        _settings_url(),
    )


async def notify_renewal_reminder(
    user: dict,
    *,
    plan_id: str,
    billing_interval: str,
    amount_due_pence: int | None,
    payment_date,
    dedupe_key: str,
) -> None:
    email = (user.get("email") or "").strip()
    if not email:
        return
    if not await _claim_billing_email(user["user_id"], dedupe_key):
        return
    await _send_safe(
        email_service.send_renewal_reminder,
        email,
        user.get("name") or "",
        _plan_label(plan_id),
        _interval_label(billing_interval),
        _format_gbp_amount(amount_due_pence),
        _format_period_end(payment_date) or "soon",
        _settings_url(),
    )