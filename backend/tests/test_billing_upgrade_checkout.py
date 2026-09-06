"""Exercise upgrade requests without live Stripe calls or a production database."""
import asyncio
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware

import billing
from api_errors import unhandled_api_error


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def stripe_setup(monkeypatch):
    monkeypatch.setenv('STRIPE_API_KEY', 'sk_test_unit_test_only')
    monkeypatch.setenv('DEV_MODE', 'true')
    monkeypatch.setattr(billing.stripe, 'api_key', None)
    monkeypatch.setattr(billing.stripe.Price, 'list', lambda **kw: {'data': [{'id': 'price_' + kw['lookup_keys'][0]}]})

    def retrieve(sub_id):
        assert billing.stripe.api_key == 'sk_test_unit_test_only', 'configure Stripe before the first API call'
        return {'id': sub_id, 'items': {'data': [{'id': 'si_old_plan'}, {'id': 'si_old_vat'}]}}

    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', retrieve)


@pytest.mark.parametrize('interval', ['monthly', 'yearly'])
def test_modify_items_use_supported_price_references(stripe_setup, interval):
    items, discounts = run(billing._build_subscription_modify_items('sub_abc', 'business', interval))
    assert items[:2] == [{'id': 'si_old_plan', 'deleted': True}, {'id': 'si_old_vat', 'deleted': True}]
    assert all(set(item) == {'price', 'quantity'} for item in items[2:])
    assert len(items) == 4
    assert not discounts


def test_new_catalog_price_is_created_with_separate_product(stripe_setup, monkeypatch):
    calls = []
    monkeypatch.setattr(billing.stripe.Price, 'list', lambda **kw: {'data': []})
    def missing(product_id):
        raise billing.stripe.error.InvalidRequestError('No such product', 'id', code='resource_missing')
    monkeypatch.setattr(billing.stripe.Product, 'retrieve', missing)
    monkeypatch.setattr(billing.stripe.Product, 'create', lambda **kw: calls.append(('product', kw)) or {'id': kw['id']})
    monkeypatch.setattr(billing.stripe.Price, 'create', lambda **kw: calls.append(('price', kw)) or {'id': 'price_created'})
    source = billing._price_data('Business', 79, description='Monthly', recurring={'interval': 'month'})
    assert run(billing._subscription_price_id(source)) == 'price_created'
    assert calls[0][1]['description'] == 'Monthly'
    assert calls[1][1]['product'] == calls[0][1]['id']
    assert calls[1][1]['unit_amount'] == 7900
    assert 'product_data' not in calls[1][1]
    assert 'product_data' in source, 'do not mutate Checkout input'


def test_preview_catches_initial_subscription_lookup_failure(stripe_setup, monkeypatch):
    def unavailable(*a, **kw):
        raise billing.stripe.error.APIConnectionError('connection interrupted')
    monkeypatch.setattr(billing.stripe.Subscription, 'retrieve', unavailable)
    user = {'stripe_subscription_id': 'sub_abc', 'stripe_customer_id': 'cus_abc', 'plan': 'pro'}
    with pytest.raises(HTTPException) as exc:
        run(billing._preview_plan_upgrade(user, 'business', 'monthly'))
    assert exc.value.status_code == 502
    assert 'calculate your upgrade total' in exc.value.detail


@pytest.mark.parametrize('interval,anchor', [('monthly', 'unchanged'), ('yearly', 'now')])
def test_preview_uses_valid_interval_anchor_and_modern_prorations(stripe_setup, monkeypatch, interval, anchor):
    def preview(**kwargs):
        assert kwargs['subscription_details']['billing_cycle_anchor'] == anchor
        assert all('price_data' not in item for item in kwargs['subscription_details']['items'])
        return {'amount_due': 3000, 'currency': 'gbp', 'lines': {'data': [
            {'amount': -500, 'parent': {'subscription_item_details': {'proration': True}}},
            {'amount': 3500, 'parent': {'subscription_item_details': {'proration': True}}},
        ]}}
    monkeypatch.setattr(billing.stripe.Invoice, 'create_preview', preview)
    user = {'stripe_subscription_id': 'sub_abc', 'stripe_customer_id': 'cus_abc', 'plan': 'pro', 'billing_interval': 'monthly'}
    result = run(billing._preview_plan_upgrade(user, 'business', interval))
    assert result['credit'] == 5
    assert result['charge'] == 35
    assert result['amount_due'] == 30


@pytest.mark.parametrize('origin,allowed', [('https://civicsign.co.uk', True), ('https://untrusted.example', False)])
def test_unhandled_errors_have_safe_body_and_restricted_cors(monkeypatch, origin, allowed):
    monkeypatch.setenv('CORS_ORIGINS', 'https://civicsign.co.uk')
    monkeypatch.setenv('DEV_MODE', 'false')
    app = FastAPI()
    app.add_exception_handler(Exception, unhandled_api_error)
    app.add_middleware(CORSMiddleware, allow_origins=['https://civicsign.co.uk'], allow_credentials=True)
    @app.get('/failure')
    async def failure():
        raise RuntimeError('private implementation detail')
    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url='http://test') as client:
            return await client.get('/failure', headers={'Origin': origin})
    result = run(request())
    assert result.status_code == 500
    assert 'private implementation detail' not in result.text
    assert result.headers.get('access-control-allow-origin') == (origin if allowed else None)
    assert result.headers.get('access-control-allow-credentials') == ('true' if allowed else None)


def test_business_checkout_route_returns_upgrade_preview(stripe_setup, monkeypatch):
    app = FastAPI()
    app.state.limiter = billing.limiter
    app.include_router(billing.billing_router)
    user = {'user_id': 'usr_abc', 'email': 'test@example.com', 'plan': 'pro', 'billing_interval': 'monthly',
            'stripe_subscription_id': 'sub_abc', 'stripe_customer_id': 'cus_abc', 'subscription_status': 'active'}
    app.dependency_overrides[billing.get_current_user] = lambda: user
    monkeypatch.setattr(billing.stripe.Invoice, 'create_preview', lambda **kw: {'amount_due': 4200, 'currency': 'gbp', 'lines': {'data': []}})
    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            return await client.post('/api/billing/checkout', json={'plan_id': 'business', 'billing_interval': 'monthly'})
    result = run(request())
    assert result.status_code == 200, result.text
    assert result.json()['upgrade_confirmation_required'] is True
    assert result.json()['preview']['amount_due'] == 42


@pytest.mark.parametrize('paid', [False, True])
def test_upgrade_with_scheduled_cancellation_uses_valid_pending_update(stripe_setup, monkeypatch, paid):
    from types import SimpleNamespace
    calls = []
    def modify(sub_id, **kwargs):
        calls.append(kwargs)
        if kwargs.get('payment_behavior') == 'pending_if_incomplete':
            assert 'cancel_at_period_end' not in kwargs
            assert all('price_data' not in item for item in kwargs['items'])
        return {'id': sub_id, 'latest_invoice': 'in_upgrade', 'status': 'active', 'current_period_end': 1893456000}
    monkeypatch.setattr(billing.stripe.Subscription, 'modify', modify)
    monkeypatch.setattr(billing, '_verify_upgrade_invoice_payment', AsyncMock(return_value={
        'paid': paid, 'invoice_id': 'in_upgrade', 'amount_due': 42,
        'url': None if paid else 'https://invoice.stripe.com/unit-test',
    }))
    monkeypatch.setattr(billing, '_record_upgrade_transaction', AsyncMock(return_value='tx_upgrade'))
    activate = AsyncMock(return_value=True)
    monkeypatch.setattr(billing, '_activate_subscription', activate)
    monkeypatch.setattr(billing.billing_emails, 'notify_plan_upgrade', AsyncMock())
    monkeypatch.setattr(billing, 'db', SimpleNamespace(users=SimpleNamespace(update_one=AsyncMock())))
    user = {'user_id': 'usr_abc', 'email': 'test@example.com', 'plan': 'pro', 'stripe_subscription_id': 'sub_abc',
            'stripe_customer_id': 'cus_abc', 'subscription_cancel_at_period_end': True}
    preview = {'current_plan': 'pro', 'current_interval': 'monthly', 'current_plan_name': 'Pro', 'credit': 5}
    result = run(billing._execute_paid_upgrade(user, 'business', 'monthly', preview, 'https://civicsign.co.uk'))
    if paid:
        assert calls[-1] == {'cancel_at_period_end': False}
        activate.assert_awaited_once()
        assert result['changed'] is True
    else:
        assert len(calls) == 1, 'do not remove cancellation before payment'
        activate.assert_not_awaited()
        assert result['payment_required'] is True
        assert result['url'] == 'https://invoice.stripe.com/unit-test'
