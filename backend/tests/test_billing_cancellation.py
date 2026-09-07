"""Cancellation must stop Stripe renewal before reporting success."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI
import billing


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('STRIPE_API_KEY', 'sk_test_unit_test_only')
    monkeypatch.setenv('DEV_MODE', 'true')
    user = {'user_id': 'cancel_test', 'plan': 'pro', 'stripe_subscription_id': 'sub_test', 'subscription_status': 'active'}
    database = SimpleNamespace(users=SimpleNamespace(update_one=AsyncMock()))
    monkeypatch.setattr(billing, 'db', database)
    monkeypatch.setattr(billing, '_record_cancellation_feedback', AsyncMock())
    downgrade = AsyncMock()
    monkeypatch.setattr(billing, '_downgrade_user_to_free', downgrade)
    monkeypatch.setattr(billing.billing_emails, 'notify_cancellation_scheduled', AsyncMock())
    retrieve = Mock(return_value={'id': 'sub_test', 'status': 'active'})
    modify = Mock(return_value={'id': 'sub_test', 'cancel_at_period_end': True, 'items': {'data': [{'current_period_end': 2000000000}]}})
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', retrieve)
    monkeypatch.setattr(billing.stripe.Subscription, 'modify', modify)
    app = FastAPI()
    app.state.limiter = billing.limiter
    app.include_router(billing.billing_router)
    app.dependency_overrides[billing.get_current_user] = lambda: user
    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            return await client.post('/api/billing/cancel', json={})
    return SimpleNamespace(user=user, db=database, downgrade=downgrade, retrieve=retrieve, modify=modify, request=lambda: asyncio.run(request()))


@pytest.mark.parametrize('status', ['active', 'trialing', 'past_due', 'unpaid'])
def test_cancellation_checks_stripe_even_when_local_access_expired(setup, status):
    setup.user['subscription_status'] = status
    result = setup.request()
    assert result.status_code == 200, result.text
    assert result.json()['cancel_at_period_end'] is True
    assert result.json()['current_period_end']
    setup.modify.assert_called_once_with('sub_test', cancel_at_period_end=True)
    setup.downgrade.assert_not_awaited()


@pytest.mark.parametrize('stage', ['retrieve', 'modify'])
def test_stripe_failure_never_reports_success_or_downgrades(setup, stage):
    getattr(setup, stage).side_effect = billing.stripe.error.APIConnectionError('offline')
    result = setup.request()
    assert result.status_code == 502
    assert 'could not be confirmed' in result.json()['detail']
    setup.downgrade.assert_not_awaited()
    setup.db.users.update_one.assert_not_awaited()


def test_missing_key_does_not_fake_cancellation(setup, monkeypatch):
    monkeypatch.delenv('STRIPE_API_KEY')
    assert setup.request().status_code == 503
    setup.downgrade.assert_not_awaited()
    setup.modify.assert_not_called()


def test_repeated_cancellation_is_idempotent(setup):
    setup.retrieve.return_value = {'id': 'sub_test', 'status': 'active', 'cancel_at_period_end': True, 'current_period_end': 2000000000}
    result = setup.request()
    assert result.status_code == 200
    assert result.json()['cancel_at_period_end'] is True
    setup.modify.assert_not_called()
