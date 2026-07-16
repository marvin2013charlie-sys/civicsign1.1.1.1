"""Billing notification email helpers."""
import asyncio
import os

import pytest

os.environ.setdefault("PLAN_ENCRYPTION_SECRET", "test-plan-secret-hex")

import billing
import billing_emails


def run(coro):
    return asyncio.run(coro)


class FakeUsers:
    def __init__(self, user):
        self._user = dict(user)
        self.emails_sent = {}

    async def find_one(self, query, projection=None):
        for key, val in query.items():
            if key == "user_id" and self._user.get("user_id") != val:
                return None
            elif key.startswith("stripe_") and self._user.get(key) != val:
                return None
            elif key == f"billing_emails_sent.{val}":
                pass
        if "billing_emails_sent" in str(query):
            return None
        return dict(self._user)

    async def update_one(self, query, update):
        for dotted, cond in query.items():
            if dotted.startswith("billing_emails_sent."):
                key = dotted.split(".", 1)[1]
                if cond == {"$exists": False} and key in self.emails_sent:
                    class _R:
                        modified_count = 0
                    return _R()
        for dotted, val in (update.get("$set") or {}).items():
            if dotted.startswith("billing_emails_sent."):
                key = dotted.split(".", 1)[1]
                self.emails_sent[key] = val
        class _R:
            modified_count = 1
        return _R()


class FakeDB:
    def __init__(self, users):
        self.users = users


@pytest.fixture
def paid_user():
    return {
        "user_id": "usr_mail",
        "email": "billing@example.com",
        "name": "Bill",
        "plan": "pro",
        "billing_interval": "monthly",
        "stripe_subscription_id": "sub_mail",
        "stripe_customer_id": "cus_mail",
        "subscription_status": "active",
        "subscription_cancel_at_period_end": False,
    }


def test_claim_billing_email_dedupes(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))
    assert run(billing_emails._claim_billing_email("usr_mail", "upgrade_test")) is True
    assert run(billing_emails._claim_billing_email("usr_mail", "upgrade_test")) is False


def test_handle_invoice_upcoming_sends_once(paid_user, monkeypatch):
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))
    sent = []

    async def fake_notify(user, **kwargs):
        sent.append(kwargs)

    monkeypatch.setattr(billing.billing_emails, "notify_renewal_reminder", fake_notify)
    invoice = {
        "id": "in_upcoming",
        "subscription": "sub_mail",
        "customer": "cus_mail",
        "amount_due": 1800,
        "period_end": 1893456000,
    }
    run(billing._handle_invoice_upcoming(invoice))
    run(billing._handle_invoice_upcoming(invoice))
    assert len(sent) == 2


def test_handle_invoice_upcoming_skips_cancelled(paid_user, monkeypatch):
    paid_user["subscription_cancel_at_period_end"] = True
    users = FakeUsers(paid_user)
    monkeypatch.setattr(billing, "db", FakeDB(users))
    sent = []

    async def fake_notify(user, **kwargs):
        sent.append(kwargs)

    monkeypatch.setattr(billing.billing_emails, "notify_renewal_reminder", fake_notify)
    run(billing._handle_invoice_upcoming({"subscription": "sub_mail", "amount_due": 1800, "period_end": 1}))
    assert sent == []


def test_format_period_end_from_timestamp():
    assert billing_emails._format_period_end(1893456000) == "01 January 2030"