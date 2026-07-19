"""Admin plan grants: signature + duration expiry."""
from datetime import datetime, timedelta, timezone

import pytest

from plan_signing import (
    admin_plan_grant_expired,
    generate_plan_signature,
    get_effective_plan,
)


@pytest.fixture(autouse=True)
def plan_secret(monkeypatch):
    monkeypatch.setenv("PLAN_ENCRYPTION_SECRET", "test-plan-secret-for-admin-grants")


def _grant(plan="pro", *, days_offset=30, expired=False):
    now = datetime.now(timezone.utc)
    ts = now.isoformat()
    end = now + timedelta(days=(-1 if expired else days_offset))
    uid = "user_grant_test"
    return {
        "user_id": uid,
        "role": "user",
        "plan": plan,
        "plan_updated_at": ts,
        "plan_signature": generate_plan_signature(uid, plan, ts),
        "admin_plan_grant": True,
        "subscription_current_period_end": end.isoformat(),
        "subscription_status": "admin_grant",
    }


def test_admin_grant_active_returns_paid_plan():
    user = _grant("business", days_offset=15)
    assert admin_plan_grant_expired(user) is False
    assert get_effective_plan(user) == "business"


def test_admin_grant_expired_returns_free():
    user = _grant("pro", expired=True)
    assert admin_plan_grant_expired(user) is True
    assert get_effective_plan(user) == "free"


def test_payment_plan_active_stripe_ignores_period_end_alone():
    """Active Stripe sub keeps plan past period_end until webhook or cancel flag."""
    now = datetime.now(timezone.utc)
    ts = now.isoformat()
    uid = "user_stripe"
    user = {
        "user_id": uid,
        "role": "user",
        "plan": "pro",
        "plan_updated_at": ts,
        "plan_signature": generate_plan_signature(uid, "pro", ts),
        "admin_plan_grant": False,
        "subscription_status": "active",
        "stripe_subscription_id": "sub_live",
        "subscription_current_period_end": (now - timedelta(days=1)).isoformat(),
    }
    assert get_effective_plan(user) == "pro"


def test_cancel_at_period_end_after_bill_date_is_free():
    now = datetime.now(timezone.utc)
    ts = now.isoformat()
    uid = "user_cancel_end"
    user = {
        "user_id": uid,
        "role": "user",
        "plan": "pro",
        "plan_updated_at": ts,
        "plan_signature": generate_plan_signature(uid, "pro", ts),
        "admin_plan_grant": False,
        "subscription_status": "active",
        "subscription_cancel_at_period_end": True,
        "stripe_subscription_id": "sub_live",
        "subscription_current_period_end": (now - timedelta(hours=1)).isoformat(),
    }
    assert get_effective_plan(user) == "free"
