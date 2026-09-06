"""Plan feature catalogue and access checks for CivicSign subscriptions."""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

logger = logging.getLogger("civicsign.plan_features")

# Self-serve Business monthly document cap (override per contract in admin).
BUSINESS_FAIR_USE_DEFAULT = 600
PRO_MONTHLY_QUOTA_DEFAULT = 100
PRO_YEARLY_QUOTA_DEFAULT = 1200
BUSINESS_YEARLY_QUOTA_DEFAULT = BUSINESS_FAIR_USE_DEFAULT * 12
BULK_SEND_MAX_ROWS_DEFAULT = 250
ENVELOPE_HOURLY_BURST_DEFAULT = 100


def _effective_plan(user: dict) -> str:
    from plan_signing import get_effective_plan
    return get_effective_plan(user)

PLAN_MONTHLY_QUOTA = {
    "free": 2,
    "pro": PRO_MONTHLY_QUOTA_DEFAULT,
    "business": BUSINESS_FAIR_USE_DEFAULT,
}

_PRO_FLAGS = {
    "monthly_quota": PRO_MONTHLY_QUOTA_DEFAULT,
    "max_recipients": None,
    "manage_pdf": True,
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
        "monthly_quota": 2,
        "max_recipients": 2,
        "manage_pdf": False,
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
        "monthly_quota": BUSINESS_FAIR_USE_DEFAULT,
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

# Organisation owners can toggle these per member at invite time.
ORG_MEMBER_CONFIGURABLE_FEATURES = frozenset({
    "manage_pdf",
    "team_templates",
    "comments",
    "custom_branding",
    "public_links",
    "bulk_send",
    "recipient_auth",
    "seal_verification",
})


def default_org_member_feature_flags() -> dict[str, bool]:
    """All business features enabled for org members except API (owner-only)."""
    return {key: True for key in ORG_MEMBER_CONFIGURABLE_FEATURES}


def normalize_org_member_feature_flags(raw: dict | None) -> dict[str, bool]:
    base = default_org_member_feature_flags()
    if not isinstance(raw, dict):
        return base
    for key in ORG_MEMBER_CONFIGURABLE_FEATURES:
        if key in raw:
            base[key] = bool(raw[key])
    return base


def is_enterprise_unlimited(user: dict) -> bool:
    """True only when admin has enabled contract-grade unlimited (e.g. signed bank deal)."""
    return _effective_plan(user) == "business" and bool(user.get("enterprise_unlimited"))


def _billing_interval(user: dict) -> str:
    return (user.get("billing_interval") or "monthly").lower().strip()


def get_monthly_envelope_limit(user: dict) -> int:
    """
    Effective document cap for the current billing period.
    -1 = no cap (enterprise_unlimited only).
    Yearly subscribers receive 12× the monthly allowance for the annual period.
    """
    plan = _effective_plan(user)
    # A stale custom paid allowance must not survive subscription expiry while
    # the request/background downgrade is still being persisted.
    if plan == "free" and user.get("plan") in ("pro", "business"):
        return PLAN_MONTHLY_QUOTA["free"]
    if is_enterprise_unlimited(user):
        return -1
    custom = user.get("monthly_envelope_limit")
    if isinstance(custom, int) and custom > 0:
        return custom
    yearly = _billing_interval(user) == "yearly"
    if plan == "business":
        monthly = int(os.environ.get("BUSINESS_FAIR_USE_MONTHLY", str(BUSINESS_FAIR_USE_DEFAULT)))
        return monthly * 12 if yearly else monthly
    if plan == "pro":
        return PRO_YEARLY_QUOTA_DEFAULT if yearly else PLAN_MONTHLY_QUOTA["pro"]
    return PLAN_MONTHLY_QUOTA.get(plan, 2)


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
    interval = _billing_interval(user)
    yearly = interval == "yearly"
    period_label = "year" if yearly else "billing period"
    if enterprise:
        note = "Enterprise unlimited — no monthly document cap (contract)."
    elif isinstance(custom, int) and custom > 0:
        note = f"Contract allocation: {custom:,} documents per month."
    elif plan == "business":
        note = (
            f"Business plan: {limit:,} documents per {period_label} "
            f"(resets on your {'subscription' if yearly else 'signup'} anniversary)."
        )
    elif limit < 0:
        note = "Unlimited documents this billing period."
    else:
        note = (
            f"{plan.capitalize()} plan: {limit:,} documents per {period_label} "
            f"(resets on your {'subscription' if yearly else 'signup'} anniversary)."
        )
    return {
        "limit": limit,
        "unlimited": limit < 0,
        "enterprise_unlimited": enterprise,
        "fair_use": plan == "business" and not enterprise and not (isinstance(custom, int) and custom > 0),
        "contract_limit": custom if isinstance(custom, int) and custom > 0 else None,
        "fair_use_default": fair_use_default if plan == "business" else None,
        "quota_note": note,
    }


def sms_auth_available() -> bool:
    """SMS recipient authentication needs a configured SMS provider.

    In dev mode the code is logged instead of sent, so it always works.
    In production, senders must not be able to pick SMS auth until a provider
    (e.g. Twilio) is wired up — otherwise signers wait for a text that never
    arrives.
    """
    if os.environ.get("DEV_MODE", "").lower() in ("1", "true", "yes"):
        return True
    return bool(os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN"))


def plan_features(user: dict) -> dict:
    from plan_signing import is_internal_team

    plan = _effective_plan(user)
    flags = dict(_PLAN_FLAGS.get(plan, _PLAN_FLAGS["free"]))
    flags["plan"] = plan
    flags["enterprise_unlimited"] = is_enterprise_unlimited(user)
    # SMS availability depends on server configuration, not just the plan tier.
    flags["recipient_auth_sms"] = bool(flags.get("recipient_auth")) and sms_auth_available()
    if is_internal_team(user):
        flags["internal_team"] = True
    if user.get("org_id"):
        seat_limit = int(os.environ.get("ORG_SEAT_MONTHLY_LIMIT", "500"))
        flags["organisation_plan"] = True
        flags["monthly_quota"] = seat_limit
        is_owner = user.get("org_role") == "owner"
        if is_owner:
            flags["pricing_note"] = (
                "Organisation plan: contract rates agreed in your onboarding meeting."
            )
        else:
            flags["api_webhooks"] = False
            overrides = user.get("org_feature_flags")
            if isinstance(overrides, dict):
                for key in ORG_MEMBER_CONFIGURABLE_FEATURES:
                    if key in overrides:
                        flags[key] = bool(overrides[key])
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
