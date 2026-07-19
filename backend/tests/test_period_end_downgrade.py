"""Auto-downgrade when billing period ends without upgrade."""
from datetime import datetime, timedelta, timezone

import pytest

from plan_signing import (
    generate_plan_signature,
    get_effective_plan,
    paid_access_should_expire,
    period_end_passed,
    should_persist_plan_downgrade,
)


@pytest.fixture(autouse=True)
def plan_secret(monkeypatch):
    monkeypatch.setenv("PLAN_ENCRYPTION_SECRET", "test-plan-secret-period-end")


def _paid_user(
    *,
    days_offset: int = 30,
    cancel_at_period_end: bool = False,
    status: str = "active",
    admin_grant: bool = False,
    stripe_sub: bool = True,
):
    now = datetime.now(timezone.utc)
    ts = now.isoformat()
    end = now + timedelta(days=days_offset)
    uid = "user_period_end"
    return {
        "user_id": uid,
        "role": "user",
        "plan": "pro",
        "plan_updated_at": ts,
        "plan_signature": generate_plan_signature(uid, "pro", ts),
        "admin_plan_grant": admin_grant,
        "subscription_status": status,
        "subscription_cancel_at_period_end": cancel_at_period_end,
        "subscription_current_period_end": end.isoformat(),
        "stripe_subscription_id": "sub_live" if stripe_sub else None,
    }


def test_active_sub_keeps_plan_before_period_end():
    user = _paid_user(days_offset=10, status="active")
    assert period_end_passed(user) is False
    assert paid_access_should_expire(user) is False
    assert get_effective_plan(user) == "pro"


def test_active_sub_keeps_plan_shortly_after_period_end_until_webhook():
    """Active renewing subscriptions are not dropped solely because period_end passed."""
    user = _paid_user(days_offset=-1, status="active", cancel_at_period_end=False)
    assert period_end_passed(user) is True
    assert paid_access_should_expire(user) is False
    assert get_effective_plan(user) == "pro"


def test_cancel_at_period_end_downgrades_after_bill_date():
    user = _paid_user(days_offset=-1, status="active", cancel_at_period_end=True)
    assert paid_access_should_expire(user) is True
    assert get_effective_plan(user) == "free"
    assert should_persist_plan_downgrade(user) is True


def test_cancel_at_period_end_keeps_access_before_bill_date():
    user = _paid_user(days_offset=5, status="active", cancel_at_period_end=True)
    assert paid_access_should_expire(user) is False
    assert get_effective_plan(user) == "pro"


def test_admin_grant_expires_on_period_end():
    user = _paid_user(days_offset=-1, admin_grant=True, stripe_sub=False, status="admin_grant")
    assert paid_access_should_expire(user) is True
    assert get_effective_plan(user) == "free"


def test_past_due_revokes_paid_access():
    user = _paid_user(days_offset=5, status="past_due")
    assert paid_access_should_expire(user) is True
    assert get_effective_plan(user) == "free"


def test_unpaid_revokes_paid_access():
    user = _paid_user(days_offset=5, status="unpaid")
    assert paid_access_should_expire(user) is True
    assert get_effective_plan(user) == "free"


def test_orphan_paid_window_without_stripe_sub_ends():
    user = _paid_user(days_offset=-1, status="active", stripe_sub=False)
    assert paid_access_should_expire(user) is True
    assert get_effective_plan(user) == "free"
