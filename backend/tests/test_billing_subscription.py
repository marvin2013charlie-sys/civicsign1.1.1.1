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
        for key, val in query.items():
            if key.startswith("billing_emails_sent."):
                subkey = key.split(".", 1)[1]
                exists = subkey in (self._user.get("billing_emails_sent") or {})
                if val == {"$exists": False} and exists:
                    return None
                if val == {"$exists": False}:
                    continue
            elif self._user.get(key) != val:
                return None
        return dict(self._user)

    async def update_one(self, query, update):
        for key, val in query.items():
            if key.startswith("billing_emails_sent."):
                subkey = key.split(".", 1)[1]
                exists = subkey in (self._user.get("billing_emails_sent") or {})
                if val == {"$exists": False} and exists:
                    class _R:
                        matched_count = 0
                        modified_count = 0
                    return _R()
        patch = {}
        for dotted, val in (update.get("$set") or {}).items():
            if dotted.startswith("billing_emails_sent."):
                subkey = dotted.split(".", 1)[1]
                self._user.setdefault("billing_emails_sent", {})[subkey] = val
            else:
                patch[dotted] = val
        if patch:
            self.last_set = {**(self.last_set or {}), **patch}
            self._user.update(patch)
        for key in update.get("$unset", {}):
            self._user.pop(key, None)

        class _R:
            matched_count = 1
            modified_count = 1
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


def test_checkout_trial_days_for_new_free_user(monkeypatch):
    monkeypatch.setattr(billing, "STRIPE_SUBSCRIPTION_TRIAL_DAYS", 30)
    user = {"plan": "free", "email": "new@example.com"}
    assert billing._checkout_trial_days(user) == 30


def test_checkout_trial_days_skips_repeat_subscribers(monkeypatch):
    monkeypatch.setattr(billing, "STRIPE_SUBSCRIPTION_TRIAL_DAYS", 30)
    user = {
        "plan": "free",
        "subscription_trial_used": True,
    }
    assert billing._checkout_trial_days(user) is None


def test_trial_already_redeemed_flag():
    assert billing._trial_already_redeemed({"subscription_trial_used": True}) is True
    assert billing._trial_already_redeemed({"plan_upgraded_via_payment": True}) is True
    assert billing._trial_already_redeemed({"plan": "free"}) is False


def test_resolve_checkout_trial_marks_redeemed_from_payment_history(monkeypatch):
    monkeypatch.setattr(billing, "STRIPE_SUBSCRIPTION_TRIAL_DAYS", 30)

    class FakeUsers:
        def __init__(self):
            self.updated = []

        async def update_one(self, query, patch):
            self.updated.append((query, patch))
            return type("R", (), {"matched_count": 1})()

    class FakeDB:
        def __init__(self, had_paid):
            self.payment_transactions = self
            self.users = FakeUsers()
            self._had_paid = had_paid

        async def find_one(self, query, projection):
            if self._had_paid:
                return {"_id": "x"}
            return None

    fake_db = FakeDB(had_paid=True)
    monkeypatch.setattr(billing, "db", fake_db)
    user = {"user_id": "u1", "plan": "free", "email": "a@b.com"}
    days, redeemed = run(billing._resolve_checkout_trial(user))
    assert days is None
    assert redeemed is True
    assert fake_db.users.updated


def test_plan_product_name_not_duplicating_subscribe_prefix():
    assert billing._plan_product_name("pro", "monthly") == "CivicSign Pro plan (monthly)"
    assert "Subscribe to" not in billing._plan_product_name("pro", "monthly")


def test_stripe_subscription_missing_detects_invalid_request(monkeypatch):
    class FakeInvalidRequestError(Exception):
        code = "resource_missing"

    monkeypatch.setattr(billing.stripe.error, "InvalidRequestError", FakeInvalidRequestError)
    err = FakeInvalidRequestError("No such subscription: sub_123")
    assert billing._stripe_subscription_missing(err) is True


def test_production_requires_live_on_secure_deploy(monkeypatch):
    monkeypatch.delenv("DEV_MODE", raising=False)
    monkeypatch.setenv("COOKIE_SECURE", "true")
    monkeypatch.setenv("FRONTEND_URL", "https://civicsign.co.uk")
    monkeypatch.delenv("STRIPE_REQUIRE_LIVE", raising=False)
    assert billing._production_requires_live() is True


def test_is_paid_upgrade_pro_to_business():
    assert billing._is_paid_upgrade("pro", "monthly", "business", "monthly") is True
    assert billing._is_paid_upgrade("pro", "yearly", "business", "yearly") is True
    assert billing._is_paid_upgrade("business", "monthly", "pro", "monthly") is False
    assert billing._is_paid_upgrade("pro", "monthly", "pro", "yearly") is True


def test_parse_invoice_preview_credit_and_charge():
    preview = {
        "amount_due": 4200,
        "currency": "gbp",
        "lines": {
            "data": [
                {"amount": -1500, "proration": True, "description": "Unused time on Pro"},
                {"amount": 5700, "proration": True, "description": "Remaining time on Business"},
            ],
        },
    }
    parsed = billing._parse_invoice_preview(preview)
    assert parsed["credit"] == 15.0
    assert parsed["charge"] == 57.0
    assert parsed["amount_due"] == 42.0
    assert parsed["requires_payment"] is True


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


def test_webhook_accepts_discounted_checkout_with_promo(monkeypatch):
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
        "amount_total": 900,
        "total_details": {"amount_discount": 900},
        "metadata": {"user_id": "usr_real"},
    }
    verified = run(billing._verify_webhook_checkout_session(obj))
    assert verified["user_id"] == "usr_real"


def test_stripe_resource_id_handles_string_and_object():
    assert billing._stripe_resource_id("pi_abc") == "pi_abc"
    assert billing._stripe_resource_id({"id": "pi_abc"}) == "pi_abc"
    assert billing._stripe_resource_id(None) is None


def test_resolve_refund_target_uses_stored_payment_intent():
    tx = {"payment_intent_id": "pi_test123", "session_id": "cs_test_abc123456"}
    target = run(billing.resolve_refund_target_for_tx(tx))
    assert target == {"payment_intent": "pi_test123"}


def test_resolve_refund_target_uses_stored_charge():
    tx = {"charge_id": "ch_test123", "session_id": "cs_test_abc123456"}
    target = run(billing.resolve_refund_target_for_tx(tx))
    assert target == {"charge": "ch_test123"}


def test_capture_checkout_payment_refs_from_subscription_invoice(monkeypatch):
    """Subscription Checkout has no session.payment_intent — use invoice PI instead."""
    updates = []

    class FakePaymentTx:
        async def update_one(self, query, update):
            updates.append((query, update))
            class _R:
                matched_count = 1
            return _R()

    class FakeSession:
        def to_dict(self):
            return {
                "id": "cs_test_subsession01",
                "mode": "subscription",
                "payment_intent": None,
                "subscription": "sub_test123",
                "invoice": "in_test123",
            }

    class FakeInvoice:
        def to_dict(self):
            return {
                "id": "in_test123",
                "payment_intent": "pi_from_invoice",
                "charge": "ch_from_invoice",
            }

    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_fake")
    monkeypatch.setattr(billing, "db", type("DB", (), {"payment_transactions": FakePaymentTx()})())
    monkeypatch.setattr(billing.stripe.checkout.Session, "retrieve", lambda *a, **k: FakeSession())
    monkeypatch.setattr(billing.stripe.Invoice, "retrieve", lambda *a, **k: FakeInvoice())

    patch = run(billing.capture_checkout_payment_refs("cs_test_subsession01"))
    assert patch["payment_intent_id"] == "pi_from_invoice"
    assert patch["charge_id"] == "ch_from_invoice"
    assert patch["subscription_id"] == "sub_test123"
    assert updates and updates[0][0] == {"session_id": "cs_test_subsession01"}


def test_resolve_refund_target_falls_back_to_capture(monkeypatch):
    tx = {"session_id": "cs_test_subsession01", "tx_id": "tx_abc"}
    captured = {"payment_intent_id": "pi_from_invoice"}

    async def fake_capture(session_id, session=None):
        return captured

    monkeypatch.setattr(billing, "capture_checkout_payment_refs", fake_capture)
    target = run(billing.resolve_refund_target_for_tx(tx))
    assert target == {"payment_intent": "pi_from_invoice"}


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


# Expiry/reconciliation regressions. All Stripe and email calls below are mocked.
@pytest.fixture
def expiry_setup(paid_user, monkeypatch):
    from datetime import datetime, timedelta, timezone
    from unittest.mock import AsyncMock

    paid_user['subscription_current_period_end'] = (
        datetime.now(timezone.utc) - timedelta(seconds=1)
    ).isoformat()
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, 'db', FakeDB(users))
    monkeypatch.setattr(billing, '_require_stripe_key', lambda: 'unit-test')
    monkeypatch.setattr(billing.billing_emails, 'notify_plan_downgrade', AsyncMock())
    return users


@pytest.mark.parametrize('modern', [False, True])
def test_subscription_period_end_supports_both_api_formats(modern):
    sub = _subscription('active')
    if modern:
        ts = sub.pop('current_period_end')
        sub['items'] = {'data': [{'current_period_end': ts}, {'current_period_end': ts + 100}]}
    assert billing._sub_period_end_iso(sub) == '2030-01-01T00:00:00+00:00'


def test_trial_end_limits_access_and_invalid_period_does_not_create_deadline():
    sub = _subscription('trialing')
    sub['trial_end'] = 1861920000
    assert billing._sub_period_end_iso(sub) == '2029-01-01T00:00:00+00:00'
    assert billing._sub_period_end_iso({'current_period_end': 'bad'}) is None


@pytest.mark.parametrize('interval', ['monthly', 'yearly'])
def test_expired_subscription_is_persisted_free_when_stripe_unavailable(expiry_setup, monkeypatch, interval):
    users = expiry_setup
    users._user['billing_interval'] = interval

    def unavailable(*args, **kwargs):
        raise RuntimeError('Stripe temporarily unavailable')

    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', unavailable)
    result = run(billing.ensure_period_end_downgrade(dict(users._user)))
    assert result['plan'] == 'free'
    assert get_effective_plan(result) == 'free'
    assert result['stripe_subscription_id'] == 'sub_abc', 'keep identity for later renewal reconciliation'


@pytest.mark.parametrize('interval', ['monthly', 'yearly'])
def test_paid_renewal_recovers_access_when_webhook_was_delayed(expiry_setup, monkeypatch, interval):
    users = expiry_setup
    sub = _subscription('active')
    sub['metadata']['billing_interval'] = interval
    sub['items'] = {'data': [{'current_period_end': sub.pop('current_period_end')}]}
    sub['latest_invoice'] = {'status': 'paid'}
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    result = run(billing.ensure_period_end_downgrade(dict(users._user)))
    assert get_effective_plan(result) == 'pro'
    assert result['billing_interval'] == interval
    assert result['subscription_current_period_end'] == '2030-01-01T00:00:00+00:00'


@pytest.mark.parametrize('invoice', [None, {'status': 'open'}, {'status': 'uncollectible'}])
def test_active_status_does_not_renew_access_without_paid_invoice(expiry_setup, monkeypatch, invoice):
    users = expiry_setup
    sub = _subscription('active')
    sub['latest_invoice'] = invoice
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    result = run(billing.ensure_period_end_downgrade(dict(users._user)))
    assert result['plan'] == 'free'
    assert result['subscription_status'] == 'past_due'
    assert result['stripe_subscription_id'] == 'sub_abc'


def test_checkout_link_records_trial_deadline(expiry_setup, monkeypatch):
    users = expiry_setup
    sub = _subscription('trialing')
    sub['items'] = {'data': [{'current_period_end': sub.pop('current_period_end')}]}
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    run(billing._link_subscription_to_user('usr_123', 'sub_abc', 'cus_abc'))
    assert users._user['subscription_status'] == 'trialing'
    assert users._user['subscription_current_period_end'] == '2030-01-01T00:00:00+00:00'
    assert get_effective_plan(users._user) == 'pro'


def test_checkout_link_failure_never_invents_active_status(expiry_setup, monkeypatch):
    def unavailable(*args, **kwargs):
        raise RuntimeError('Stripe temporarily unavailable')
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', unavailable)
    with pytest.raises(RuntimeError):
        run(billing._link_subscription_to_user('usr_123', 'sub_abc', 'cus_abc'))
    assert get_effective_plan(expiry_setup._user) == 'free'


def _invoice_webhook(monkeypatch, event_type, modern=True):
    from fastapi import Request
    sub_ref = {'parent': {'subscription_details': {'subscription': 'sub_abc'}}} if modern else {'subscription': 'sub_abc'}
    obj = {'id': 'in_abc', 'status': 'open' if event_type == 'invoice.payment_failed' else 'paid', **sub_ref}
    event = {'type': event_type, 'data': {'object': obj}}
    monkeypatch.setattr(billing, 'get_webhook_secret', lambda: 'unit-test')
    monkeypatch.setattr(billing.stripe.Webhook, 'construct_event', lambda *a: event)
    async def receive():
        return {'type': 'http.request', 'body': b'{}', 'more_body': False}
    return Request({'type': 'http', 'headers': [(b'stripe-signature', b'test')]}, receive)


@pytest.mark.parametrize('modern', [False, True])
@pytest.mark.parametrize('event_type', ['invoice.payment_failed', 'invoice.payment_succeeded', 'invoice.paid'])
def test_invoice_webhooks_reconcile_failure_and_recovery(expiry_setup, monkeypatch, modern, event_type):
    from unittest.mock import AsyncMock
    users = expiry_setup
    failed = event_type == 'invoice.payment_failed'
    if not failed:
        users._user.update(plan='free', plan_signature=None, subscription_status='past_due')
    sub = _subscription('past_due' if failed else 'active')
    sub['latest_invoice'] = {'status': 'open' if failed else 'paid'}
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    monkeypatch.setattr(billing, '_complete_pending_upgrade_from_invoice', AsyncMock())
    request = _invoice_webhook(monkeypatch, event_type, modern)
    assert run(billing.stripe_webhook(request)) == {'received': True}
    assert get_effective_plan(users._user) == ('free' if failed else 'pro')
    assert users._user['stripe_subscription_id'] == 'sub_abc'


def test_failed_invoice_processing_error_is_not_acknowledged(expiry_setup, monkeypatch):
    def unavailable(*args, **kwargs):
        raise RuntimeError('Stripe temporarily unavailable')
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', unavailable)
    request = _invoice_webhook(monkeypatch, 'invoice.payment_failed')
    with pytest.raises(RuntimeError):
        run(billing.stripe_webhook(request))


def test_expiry_cannot_overwrite_concurrent_successful_renewal(expiry_setup, monkeypatch):
    users = expiry_setup
    snapshot = dict(users._user)

    async def renewal_arrived(sub_id):
        users._user['subscription_current_period_end'] = '2030-01-01T00:00:00+00:00'
        raise RuntimeError('refresh request failed after webhook renewed the account')

    monkeypatch.setattr(billing, '_refresh_subscription_state', renewal_arrived)
    result = run(billing.ensure_period_end_downgrade(snapshot))
    assert get_effective_plan(result) == 'pro'
    assert result['subscription_current_period_end'] == '2030-01-01T00:00:00+00:00'


def test_authenticated_request_returns_free_plan_and_free_quota_on_expiry(expiry_setup, monkeypatch):
    import auth
    from fastapi import Request
    from plan_features import get_monthly_envelope_limit, has_feature
    from unittest.mock import AsyncMock

    user = dict(expiry_setup._user, monthly_envelope_limit=600, billing_interval='yearly')
    expiry_setup._user.update(user)
    # Even before persistence, old paid contract allowances cannot bypass expiry.
    assert get_monthly_envelope_limit(user) == 2
    assert has_feature(user, 'manage_pdf') is False
    monkeypatch.setattr(auth, '_access_token_from_request', lambda request: 'unit-test')
    monkeypatch.setattr(auth, 'user_from_access_token', AsyncMock(return_value=user))
    monkeypatch.setattr(billing, '_refresh_subscription_state', AsyncMock(side_effect=RuntimeError('unavailable')))
    result = run(auth.get_current_user(Request({'type': 'http', 'headers': []})))
    assert result['plan'] == 'free'
    assert result['billing_interval'] == 'monthly'
    assert get_monthly_envelope_limit(result) == 2


def test_background_expiry_reaches_accounts_beyond_first_500_active_users(expiry_setup, monkeypatch):
    from plan_signing import generate_plan_signature

    records = {}
    for index in range(502):
        user = dict(expiry_setup._user)
        uid = f'usr_{index}'
        user.update(user_id=uid, subscription_current_period_end='2030-01-01T00:00:00+00:00')
        user['plan_signature'] = generate_plan_signature(uid, user['plan'], user['plan_updated_at'])
        records[uid] = FakeUsers(user)
    records['usr_501']._user.update(
        subscription_current_period_end='2020-01-01T00:00:00+00:00',
        stripe_subscription_id=None,
    )

    class Cursor:
        def __init__(self, rows):
            self.rows = rows
        def limit(self, count):
            self.rows = self.rows[:count]
            return self
        def __aiter__(self):
            async def iterate():
                for row in self.rows:
                    yield dict(row)
            return iterate()

    class Users:
        def find(self, query, projection):
            return Cursor([dict(record._user) for record in records.values()])
        async def find_one(self, query, projection=None):
            return await records[query['user_id']].find_one(query, projection)
        async def update_one(self, query, patch):
            return await records[query['user_id']].update_one(query, patch)

    monkeypatch.setattr(billing, 'db', FakeDB(Users()))
    assert run(billing.process_period_end_downgrades(limit=100)) == 1
    assert records['usr_501']._user['plan'] == 'free'
    assert records['usr_0']._user['plan'] == 'pro'


def test_unpaid_upgrade_keeps_existing_paid_tier_until_its_deadline(expiry_setup, monkeypatch):
    users = expiry_setup
    users._user['subscription_current_period_end'] = '2029-01-01T00:00:00+00:00'
    sub = _subscription('active', plan_id='business')
    sub['latest_invoice'] = {'status': 'open', 'billing_reason': 'subscription_update'}
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    run(billing._refresh_subscription_state('sub_abc'))
    assert get_effective_plan(users._user) == 'pro'
    assert users._user['subscription_current_period_end'] == '2029-01-01T00:00:00+00:00'


def test_unpaid_upgrade_cannot_extend_an_expired_paid_tier(expiry_setup, monkeypatch):
    sub = _subscription('active', plan_id='business')
    sub['latest_invoice'] = {'status': 'open', 'billing_reason': 'subscription_update'}
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', lambda *a, **k: sub)
    run(billing._refresh_subscription_state('sub_abc'))
    assert get_effective_plan(expiry_setup._user) == 'free'
