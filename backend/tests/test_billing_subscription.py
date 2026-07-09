"""Subscription lifecycle: a failed or cancelled payment must stop the service.

These tests mock the Mongo `users` collection and exercise the pure billing
state machine (activate / downgrade) plus the Stripe webhook dispatch, so they
run without a live database or Stripe keys.
"""
import asyncio
import os

import pytest

os.environ.setdefault("PLAN_ENCRYPTION_SECRET", "test-plan-secret-hex")

import billing
from plan_signing import get_effective_plan


def run(coro):
    return asyncio.run(coro)


class FakeUsers:
    """Minimal async stand-in for db.users that records the last $set patch."""

    def __init__(self, user):
        self._user = dict(user)
        self.last_set = None

    async def find_one(self, query, projection=None):
        # Match by any field present in both query and the stored user.
        for key, val in query.items():
            if self._user.get(key) != val:
                return None
        return dict(self._user)

    async def update_one(self, query, update):
        self.last_set = update.get("$set", {})
        self._user.update(self.last_set)

        class _R:
            matched_count = 1
        return _R()


class FakeDB:
    def __init__(self, users):
        self.users = users


@pytest.fixture
def paid_user():
    return {
        "user_id": "usr_123",
        "email": "pro@example.com",
        "name": "Pro User",
        "plan": "pro",
        "plan_updated_at": "2026-01-01T00:00:00+00:00",
        "plan_signature": billing._generate_plan_signature("usr_123", "pro", "2026-01-01T00:00:00+00:00"),
        "billing_interval": "monthly",
        "stripe_customer_id": "cus_abc",
        "stripe_subscription_id": "sub_abc",
        "subscription_status": "active",
    }


def _subscription(status, plan_id="pro"):
    return {
        "id": "sub_abc",
        "customer": "cus_abc",
        "status": status,
        "current_period_end": 1893456000,  # 2030-01-01
        "metadata": {"user_id": "usr_123", "plan_id": plan_id, "billing_interval": "monthly"},
    }


def test_active_subscription_keeps_plan(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._handle_subscription_state(_subscription("active")))

    assert users.last_set["plan"] == "pro"
    assert users.last_set["plan_signature"], "active subscription must keep a valid signature"
    # Effective plan resolves to pro (signature verifies).
    assert get_effective_plan(users._user) == "pro"


@pytest.mark.parametrize("status", ["past_due", "unpaid", "canceled", "incomplete_expired"])
def test_failed_or_cancelled_subscription_stops_service(paid_user, monkeypatch, status):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._handle_subscription_state(_subscription(status)))

    assert users.last_set["plan"] == "free", f"status={status} must revoke the paid plan"
    assert users.last_set["plan_signature"] is None
    # get_effective_plan now returns free everywhere → quotas/features revert.
    assert get_effective_plan(users._user) == "free"
    assert users._user["subscription_status"] == status


def test_subscription_deleted_webhook_downgrades(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._handle_subscription_state(_subscription("canceled")))

    assert users._user["plan"] == "free"


def test_unknown_plan_id_does_not_activate(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    # Active status but a bogus plan → must not grant access.
    run(billing._handle_subscription_state(_subscription("active", plan_id="enterprise_hacker")))

    assert users.last_set["plan"] == "free"


def test_downgrade_clears_paid_flags(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._downgrade_user_to_free("usr_123", reason="test", subscription_status="past_due"))

    s = users.last_set
    assert s["plan"] == "free"
    assert s["plan_signature"] is None
    assert s["plan_upgraded_via_payment"] is False
    assert s["monthly_envelope_limit"] is None
