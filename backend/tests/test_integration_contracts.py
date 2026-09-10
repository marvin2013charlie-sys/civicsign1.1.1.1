"""Exercise integration routes through HTTP, with isolated storage and delivery."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI
import integrations as mod


@pytest.fixture
def setup(monkeypatch):
    user = {'user_id': 'integration_owner', 'plan': 'business', 'active': True}
    from plan_signing import generate_plan_signature
    monkeypatch.setenv('PLAN_ENCRYPTION_SECRET', 'integration-test-secret')
    user['plan_updated_at'] = '2026-01-01T00:00:00+00:00'
    user['plan_signature'] = generate_plan_signature(user['user_id'], 'business', user['plan_updated_at'])
    cursor = Mock()
    for method in ('sort', 'skip', 'limit'):
        getattr(cursor, method).return_value = cursor
    cursor.to_list = AsyncMock(return_value=[])
    database = SimpleNamespace(
        users=SimpleNamespace(find_one=AsyncMock(return_value=user), update_one=AsyncMock()),
        envelopes=SimpleNamespace(find=Mock(return_value=cursor), find_one=AsyncMock(return_value=None)),
    )
    monkeypatch.setattr(mod, 'db', database)
    monkeypatch.setattr(mod, 'validate_webhook_url', lambda url: url)
    app = FastAPI()
    app.include_router(mod.integrations_router)
    app.include_router(mod.v1_router)
    app.dependency_overrides[mod.get_current_user] = lambda: user
    app.dependency_overrides[mod.get_api_key_user] = lambda: user
    async def request(method, path, **kwargs):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            return await client.request(method, path, **kwargs)
    return SimpleNamespace(user=user, db=database, cursor=cursor, request=lambda *a, **k: asyncio.run(request(*a, **k)))


@pytest.mark.parametrize('query', ['limit=oops', 'limit=0', 'limit=101', 'offset=-1'])
def test_invalid_pagination_returns_validation_error(setup, query):
    assert setup.request('GET', '/api/v1/envelopes?' + query).status_code == 422
    setup.db.envelopes.find.assert_not_called()


def test_pagination_and_tenant_scope(setup):
    result = setup.request('GET', '/api/v1/envelopes?limit=10&offset=20&status=sent')
    assert result.status_code == 200
    assert result.json()['offset'] == 20
    setup.cursor.skip.assert_called_once_with(20)
    assert setup.db.envelopes.find.call_args.args[0] == {'owner_id': 'integration_owner', 'status': 'sent'}


def test_detail_is_scoped_to_key_owner(setup):
    assert setup.request('GET', '/api/v1/envelopes/other_tenant').status_code == 404
    assert setup.db.envelopes.find_one.call_args.args[0]['owner_id'] == 'integration_owner'


def test_first_secret_returned_once_and_not_in_get(setup):
    response = setup.request('PATCH', '/api/me/webhook', json={'url': 'https://example.com/hook', 'enabled': True})
    assert response.status_code == 200
    assert response.json()['secret']
    setup.user['webhook'] = setup.db.users.update_one.call_args.args[1]['$set']['webhook']
    assert 'secret' not in setup.request('GET', '/api/me/webhook').json()
    assert 'secret' not in setup.request('PATCH', '/api/me/webhook', json={'enabled': False}).json()


def test_cannot_enable_without_destination(setup):
    assert setup.request('PATCH', '/api/me/webhook', json={'enabled': True}).status_code == 400
    setup.db.users.update_one.assert_not_awaited()


def test_test_event_ignores_subscription_filter(setup, monkeypatch):
    setup.user['webhook'] = {'url': 'https://example.com/hook', 'events': ['envelope.completed'], 'secret': 'test'}
    monkeypatch.setattr(mod, 'owner_has_feature', AsyncMock(return_value=True))
    post = AsyncMock(return_value=(True, 200, None))
    monkeypatch.setattr(mod, '_post_webhook_once', post)
    monkeypatch.setattr(mod, '_record_delivery', AsyncMock())
    response = setup.request('POST', '/api/me/webhook/test')
    assert response.status_code == 200
    assert response.json()['delivered']
    assert post.call_args.args[2]['X-CivicSign-Signature']


@pytest.mark.parametrize('user', [None, {'user_id': 'free', 'plan': 'free'}, {'user_id': 'staff', 'plan': 'business', 'org_id': 'org', 'org_role': 'member'}])
def test_key_rejects_missing_unpaid_or_org_member(setup, user):
    setup.db.users.find_one.return_value = user
    assert asyncio.run(mod._user_by_api_key('cs_live_' + 'x' * 32)) is None
