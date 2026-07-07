"""Plan feature catalogue and access checks for CivicSign subscriptions."""
import os
import logging
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

logger = logging.getLogger("civicsign.plan_features")

# Default fair-use included with self-serve Business (override per contract in admin).
BUSINESS_FAIR_USE_DEFAULT = 10_000
BULK_SEND_MAX_ROWS_DEFAULT = 250
ENVELOPE_HOURLY_BURST_DEFAULT = 100


def _effective_plan(user: dict) -> str:
    from billing import get_effective_plan
    return get_effective_plan(user)

PLAN_MONTHLY_QUOTA = {"free": 5, "pro": 500, "business": -1}

_PRO_FLAGS = {
    "monthly_quota": 500,
    "max_recipients": None,
    "ses_signatures": True,
    "aes_signatures": True,
    "qes_available": False,
    "team_templates": True,
    "comments": True,
    "seal_verification": True,
    "custom_branding": True,
    "public_links": True,
    "auto_reminders": True,
    "recipient_auth": False,
    "bulk_send": False,
    "api_webhooks": False,
    "priority_support": False,
}

_PLAN_FLAGS = {
    "free": {
        "monthly_quota": 5,
        "max_recipients": 2,
        "ses_signatures": False,
        "aes_signatures": False,
        "qes_available": False,
        "team_templates": False,
        "comments": False,
        "seal_verification": False,
        "custom_branding": False,
        "public_links": False,
        "auto_reminders": True,
        "recipient_auth": False,
        "bulk_send": False,
        "api_webhooks": False,
        "priority_support": False,
    },
    "pro": dict(_PRO_FLAGS),
    "business": {
        **_PRO_FLAGS,
        "monthly_quota": -1,
        "recipient_auth": True,
        "bulk_send": True,
        "api_webhooks": True,
        "priority_support": True,
    },
}

_PRO_UPGRADE_MSG = "This feature requires a Pro plan or higher. Upgrade in Settings → Subscription."
_BUSINESS_UPGRADE_MSG = (
    "This feature requires a Business plan tailored to your team. "
    "Contact us via the Contact page or upgrade in Settings → Subscription."
)

_BUSINESS_ONLY = frozenset({
    "recipient_auth", "bulk_send", "api_webhooks", "priority_support",
})


def is_enterprise_unlimited(user: dict) -> bool:
    """True only when admin has enabled contract-grade unlimited (e.g. signed bank deal)."""
    return _effective_plan(user) == "business" and bool(user.get("enterprise_unlimited"))


def get_monthly_envelope_limit(user: dict) -> int:
    """
    Effective monthly envelope cap for this account.
    -1 = no monthly cap (enterprise_unlimited only).
    Business default = fair-use pool (BUSINESS_FAIR_USE_MONTHLY), not literally infinite.
    """
    plan = _effective_plan(user)
    if is_enterprise_unlimited(user):
        return -1
    custom = user.get("monthly_envelope_limit")
    if isinstance(custom, int) and custom > 0:
        return custom
    if plan == "business":
        return int(os.environ.get("BUSINESS_FAIR_USE_MONTHLY", str(BUSINESS_FAIR_USE_DEFAULT)))
    return PLAN_MONTHLY_QUOTA.get(plan, 5)


def get_bulk_send_max_rows() -> int:
    return int(os.environ.get("BULK_SEND_MAX_ROWS", str(BULK_SEND_MAX_ROWS_DEFAULT)))


def get_hourly_burst_limit(user: dict) -> int:
    if is_enterprise_unlimited(user):
        return int(os.environ.get("ENTERPRISE_HOURLY_BURST", "2000"))
    return int(os.environ.get("ENVELOPE_HOURLY_BURST", str(ENVELOPE_HOURLY_BURST_DEFAULT)))


def quota_context(user: dict) -> dict:
    """Metadata for /usage and admin — explains how the limit was derived."""
    plan = _effective_plan(user)
    limit = get_monthly_envelope_limit(user)
    enterprise = is_enterprise_unlimited(user)
    custom = user.get("monthly_envelope_limit")
    fair_use_default = int(os.environ.get("BUSINESS_FAIR_USE_MONTHLY", str(BUSINESS_FAIR_USE_DEFAULT)))
    if enterprise:
        note = "Enterprise unlimited — no monthly document cap (contract)."
    elif isinstance(custom, int) and custom > 0:
        note = f"Contract allocation: {custom:,} documents per month."
    elif plan == "business":
        note = (
            f"Business fair use: {fair_use_default:,} documents/month included. "
            "Contact us to raise your allocation for high-volume teams."
        )
    elif limit < 0:
        note = "Unlimited documents this month."
    else:
        note = f"{plan.capitalize()} plan: {limit} documents per billing period (resets on your signup anniversary)."
    return {
        "limit": limit,
        "unlimited": limit < 0,
        "enterprise_unlimited": enterprise,
        "fair_use": plan == "business" and not enterprise and not (isinstance(custom, int) and custom > 0),
        "contract_limit": custom if isinstance(custom, int) and custom > 0 else None,
        "fair_use_default": fair_use_default if plan == "business" else None,
        "quota_note": note,
    }


def plan_features(user: dict) -> dict:
    plan = _effective_plan(user)
    flags = dict(_PLAN_FLAGS.get(plan, _PLAN_FLAGS["free"]))
    flags["plan"] = plan
    flags["enterprise_unlimited"] = is_enterprise_unlimited(user)
    if user.get("org_id"):
        seat_limit = int(os.environ.get("ORG_SEAT_MONTHLY_LIMIT", "500"))
        flags["organisation_plan"] = True
        flags["monthly_quota"] = seat_limit
        flags["pricing_note"] = (
            "Organisation plan: contract rates agreed in your onboarding meeting."
        )
    return flags


def has_feature(user: dict, feature: str) -> bool:
    return bool(plan_features(user).get(feature))


def require_feature(user: dict, feature: str) -> None:
    if not has_feature(user, feature):
        msg = _BUSINESS_UPGRADE_MSG if feature in _BUSINESS_ONLY else _PRO_UPGRADE_MSG
        raise HTTPException(status_code=402, detail=msg)


def require_business_feature(user: dict, feature: str) -> None:
    require_feature(user, feature)


async def current_month_envelope_count(owner_id: str, period: dict | None = None) -> int:
    """Immutable period usage — envelope deletion does not reduce this count."""
    from usage_ledger import get_monthly_usage, resolve_user_period
    if period is None:
        period = await resolve_user_period(owner_id)
    return await get_monthly_usage(owner_id, period)


async def owner_has_feature(owner_id: str, feature: str) -> bool:
    from db import db

    owner = await db.users.find_one({"user_id": owner_id}, {"_id": 0})
    if not owner:
        return False
    return has_feature(owner, feature)