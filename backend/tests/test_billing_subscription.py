"""Subscription lifecycle: a failed or cancelled payment must stop the service.

These tests mock the Mongo `users` collection and exercise the pure billing
state machine (activate / downgrade) plus the Stripe webhook dispatch, so they
run without a live database or Stripe keys.
"""
import asyncio
import os

import pytest
from fastapi import HTTPException

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
        for key in update.get("$unset", {}):
            self._user.pop(key, None)

        class _R:
            matched_count = 1
        return _R()


class FakePaymentTransactions:
    def __init__(self, tx):
        self._tx = dict(tx)

    async def find_one(self, query, projection=None):
        for key, val in query.items():
            if self._tx.get(key) != val:
                return None
        return dict(self._tx)

    async def update_one(self, query, update):
        for key, val in query.items():
            if self._tx.get(key) != val:
                class _R:
                    matched_count = 0
                return _R()
        self._tx.update(update.get("$set", {}))
        class _R:
            matched_count = 1
        return _R()


class FakeDB:
    def __init__(self, users, payment_transactions=None):
        self.users = users
        self.payment_transactions = payment_transactions or FakePaymentTransactions({})


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


def _subscription(status, plan_id="pro", *, cancel_at_period_end=False):
    return {
        "id": "sub_abc",
        "customer": "cus_abc",
        "status": status,
        "current_period_end": 1893456000,  # 2030-01-01
        "cancel_at_period_end": cancel_at_period_end,
        "metadata": {"user_id": "usr_123", "plan_id": plan_id, "billing_interval": "monthly"},
    }


def test_active_subscription_keeps_plan(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._handle_subscription_state(_subscription("active")))

    assert users._user["plan"] == "pro"
    assert users._user["plan_signature"], "active subscription must keep a valid signature"
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


def test_cancel_at_period_end_keeps_plan_until_deleted(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._handle_subscription_state(_subscription("active", cancel_at_period_end=True)))

    assert users._user["plan"] == "pro"
    assert users._user["subscription_cancel_at_period_end"] is True
    assert get_effective_plan(users._user) == "pro"

    run(billing._handle_subscription_state(_subscription("canceled")))

    assert users._user["plan"] == "free"
    assert users._user.get("stripe_subscription_id") is None
    assert users._user.get("subscription_cancel_at_period_end") is False


def test_downgrade_clears_paid_flags(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))

    run(billing._downgrade_user_to_free("usr_123", reason="test", subscription_status="past_due"))

    s = users.last_set
    assert s["plan"] == "free"
    assert s["plan_signature"] is None
    assert s["plan_upgraded_via_payment"] is False
    assert s["monthly_envelope_limit"] is None
    assert s["subscription_cancel_at_period_end"] is False
    assert users._user.get("stripe_subscription_id") is None


def test_is_plan_purchase_tx():
    assert billing._is_plan_purchase_tx({"plan_id": "pro"}) is True
    assert billing._is_plan_purchase_tx({"plan_id": "pro", "purchase_type": "extra_document"}) is False
    assert billing._is_plan_purchase_tx({"purchase_type": "extra_document"}) is False


def test_valid_stripe_session_id():
    assert billing._valid_stripe_session_id("cs_test_abc123") is True
    assert billing._valid_stripe_session_id("not_a_session") is False
    assert billing._valid_stripe_session_id("cs_x") is False


def test_webhook_rejects_metadata_user_mismatch(monkeypatch):
    tx = {
        "session_id": "cs_test_session123",
        "user_id": "usr_real",
        "amount": 18.0,
        "plan_id": "pro",
    }
    monkeypatch.setattr(
        billing,
        "db",
        FakeDB(FakeUsers({}), FakePaymentTransactions(tx)),
    )
    obj = {
        "id": "cs_test_session123",
        "payment_status": "paid",
        "amount_total": 1800,
        "metadata": {"user_id": "usr_attacker"},
    }
    with pytest.raises(HTTPException) as exc:
        run(billing._verify_webhook_checkout_session(obj))
    assert exc.value.status_code == 400


def test_webhook_rejects_amount_mismatch(monkeypatch):
    tx = {
        "session_id": "cs_test_session123",
        "user_id": "usr_real",
        "amount": 18.0,
        "plan_id": "pro",
    }
    monkeypatch.setattr(
        billing,
        "db",
        FakeDB(FakeUsers({}), FakePaymentTransactions(tx)),
    )
    obj = {
        "id": "cs_test_session123",
        "payment_status": "paid",
        "amount_total": 999,
        "metadata": {"user_id": "usr_real"},
    }
    with pytest.raises(HTTPException) as exc:
        run(billing._verify_webhook_checkout_session(obj))
    assert exc.value.status_code == 400


def test_webhook_accepts_matching_checkout(monkeypatch):
    tx = {
        "session_id": "cs_test_session123",
        "user_id": "usr_real",
        "amount": 18.0,
        "plan_id": "pro",
    }
    monkeypatch.setattr(
        billing,
        "db",
        FakeDB(FakeUsers({}), FakePaymentTransactions(tx)),
    )
    obj = {
        "id": "cs_test_session123",
        "payment_status": "paid",
        "amount_total": 1800,
        "metadata": {"user_id": "usr_real"},
    }
    verified = run(billing._verify_webhook_checkout_session(obj))
    assert verified["user_id"] == "usr_real"
