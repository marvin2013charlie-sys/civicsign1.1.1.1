import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException
import identity_verification as identity

SESSION_ID = '53e01ad2-2345-4e87-9765-908fad715678'

@pytest.fixture
def setup(monkeypatch):
    for key, value in {'IDENTITY_VERIFICATION_ENABLED':'true', 'VERIFF_API_KEY':'test-key',
        'VERIFF_SHARED_SECRET':'mock-secret', 'VERIFF_API_BASE':'https://stationapi.veriff.com',
        'VERIFF_SESSION_ORIGIN':'https://magic.veriff.me', 'VERIFF_IDV_PROFILE_CONFIRMED':'true',
        'VERIFF_ENVIRONMENT':'live', 'DEV_MODE':'false'}.items():
        monkeypatch.setenv(key, value)
    env = {'envelope_id':'env_test', 'status':'sent'}
    recipient = {'recipient_id':'rcp_test', 'access_token':'private_token', 'name':'Jane Smith',
                 'email':'signer@example.com', 'auth_method':'identity', 'identity_provider':'veriff',
                 'identity_session_id':SESSION_ID}
    session = {'id':SESSION_ID, 'vendorData':identity._binding(env, recipient), 'status':'approved',
               'code':9001, 'person':{'firstName':'Jane','lastName':'Smith'}, 'document':{'type':'PASSPORT'}}
    request = AsyncMock(return_value={'status':'success','verification':session})
    write = AsyncMock(return_value=SimpleNamespace(matched_count=1))
    monkeypatch.setattr(identity, '_request', request)
    monkeypatch.setattr(identity, 'db', SimpleNamespace(envelopes=SimpleNamespace(update_one=write)))
    return SimpleNamespace(env=env, recipient=recipient, session=session, request=request, write=write)


def check(setup):
    return asyncio.run(identity.check_identity(setup.env, setup.recipient))

@pytest.mark.parametrize('document', ['PASSPORT','DRIVERS_LICENSE'])
def test_approved_supported_document_unlocks_without_storing_id_data(setup, document):
    setup.session['document']['type'] = document
    assert check(setup)['verified'] is True
    update = setup.write.call_args.args[1]
    assert update['$set']['recipients.$.auth_verified'] is True
    assert 'firstName' not in str(update) and 'person' not in update

@pytest.mark.parametrize('status,code', [('declined',9102),('resubmission_requested',9103),('expired',9104),('approved',9102)])
def test_other_decisions_never_unlock(setup, status, code):
    setup.session.update(status=status, code=code)
    assert check(setup)['verified'] is False
    setup.write.assert_not_awaited()


def test_pending_never_unlocks(setup):
    setup.request.return_value['verification'] = None
    assert check(setup)['status'] == 'processing'
    setup.write.assert_not_awaited()


def test_different_person_never_unlocks(setup):
    setup.session['person']['firstName'] = 'Other'
    assert check(setup)['status'] == 'name_mismatch'
    setup.write.assert_not_awaited()


def test_other_document_never_unlocks(setup):
    setup.session['document']['type'] = 'ID_CARD'
    assert check(setup)['status'] == 'unsupported_document'
    setup.write.assert_not_awaited()

@pytest.mark.parametrize('field', ['id','vendorData'])
def test_wrong_session_binding_is_rejected(setup, field):
    setup.session[field] = 'other'
    with pytest.raises(HTTPException) as exc: check(setup)
    assert exc.value.status_code == 409
    setup.write.assert_not_awaited()


def test_disabled_or_unconfirmed_provider_never_enabled(setup, monkeypatch):
    monkeypatch.setenv('VERIFF_IDV_PROFILE_CONFIRMED','false')
    assert not identity.identity_available()
    with pytest.raises(HTTPException): check(setup)
    setup.request.assert_not_awaited()


def test_test_environment_cannot_enable_production(setup, monkeypatch):
    monkeypatch.setenv('VERIFF_ENVIRONMENT','test')
    assert not identity.identity_available()
    monkeypatch.setenv('DEV_MODE','true')
    assert identity.identity_available()


def test_parallel_creation_claim_prevents_duplicate_provider_calls(setup):
    setup.write.return_value.matched_count = 0
    with pytest.raises(HTTPException) as exc:
        asyncio.run(identity.start_identity(setup.env, setup.recipient))
    assert exc.value.status_code == 409
    setup.request.assert_not_awaited()


def test_start_stores_and_returns_valid_session(setup):
    setup.request.return_value['verification']['url'] = 'https://magic.veriff.me/v/test'
    result = asyncio.run(identity.start_identity(setup.env, setup.recipient))
    assert result['url'] == 'https://magic.veriff.me/v/test'
    assert setup.write.await_count == 2
    assert 'private_token' not in str(setup.request.call_args)


def test_existing_session_reused_without_charge(setup):
    setup.recipient['identity_session_url'] = 'https://magic.veriff.me/v/test'
    assert asyncio.run(identity.start_identity(setup.env, setup.recipient))['url']
    setup.request.assert_not_awaited()


def test_changed_request_cannot_be_unlocked(setup):
    setup.write.return_value.matched_count = 0
    with pytest.raises(HTTPException) as exc: check(setup)
    assert exc.value.status_code == 409

@pytest.mark.parametrize('valid', [True,False])
def test_provider_response_hmac_checked(monkeypatch, valid):
    monkeypatch.setenv('VERIFF_SHARED_SECRET','mock-secret')
    monkeypatch.setenv('VERIFF_API_KEY','mock-key')
    monkeypatch.setenv('VERIFF_API_BASE','https://stationapi.veriff.com')
    monkeypatch.setattr(identity, '_require_provider', lambda: None)
    body = json.dumps({'status':'success','verification':None}).encode()
    signature = identity._signature(body) if valid else 'forged'
    async def request(self, method, url, **kwargs):
        assert kwargs['headers']['X-HMAC-SIGNATURE'] == identity._signature(SESSION_ID.encode())
        return httpx.Response(200, content=body, headers={'x-hmac-signature':signature}, request=httpx.Request(method,url))
    monkeypatch.setattr(httpx.AsyncClient,'request',request)
    if valid:
        assert asyncio.run(identity._request('GET', '/v1/sessions/test/decision', session_id=SESSION_ID))['verification'] is None
    else:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(identity._request('GET', '/v1/sessions/test/decision', session_id=SESSION_ID))
        assert exc.value.status_code == 502


def test_identity_gate_blocks_pdf_before_verification():
    from server import _assert_signer_file_access
    with pytest.raises(HTTPException) as exc:
        _assert_signer_file_access({'status':'sent','signing_order':'parallel','recipients':[]},
            {'status':'pending','auth_method':'identity','auth_verified':False})
    assert exc.value.status_code == 403
