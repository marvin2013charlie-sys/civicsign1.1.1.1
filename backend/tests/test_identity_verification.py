import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
import identity_verification as identity


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('IDENTITY_VERIFICATION_ENABLED', 'true')
    monkeypatch.setenv('STRIPE_IDENTITY_API_KEY', 'sk_live_mock_only')
    monkeypatch.setenv('IDENTITY_RETURN_ORIGIN', 'https://www.civicsign.co.uk')
    env = {'envelope_id': 'env_test', 'status': 'sent'}
    recipient = {'recipient_id': 'rcp_test', 'access_token': 'private_test_token',
                 'name': 'Jane Smith', 'email': 'signer@example.com', 'auth_method': 'identity'}
    session = {'id': 'vs_test', 'livemode': True, 'status': 'verified',
               'metadata': {'envelope_id': 'env_test', 'recipient_id': 'rcp_test'},
               'verified_outputs': {'first_name': 'Jane', 'last_name': 'Smith'}}
    retrieve = Mock(return_value=session)
    create = Mock(return_value={**session, 'status': 'requires_input', 'url': 'https://verify.stripe.com/test'})
    write = AsyncMock(return_value=SimpleNamespace(matched_count=1))
    monkeypatch.setattr(identity.stripe.identity.VerificationSession, 'retrieve', retrieve)
    monkeypatch.setattr(identity.stripe.identity.VerificationSession, 'create', create)
    monkeypatch.setattr(identity, 'db', SimpleNamespace(envelopes=SimpleNamespace(update_one=write)))
    return SimpleNamespace(env=env, recipient=recipient, session=session, create=create, write=write)


def test_start_requires_live_document_and_selfie_capture(setup):
    result = asyncio.run(identity.start_identity(setup.env, setup.recipient))
    assert result['url'].startswith('https://verify.stripe.com/')
    kwargs = setup.create.call_args.kwargs
    assert kwargs['options']['document'] == {'allowed_types': ['passport', 'driving_license'], 'require_matching_selfie': True, 'require_live_capture': True}
    assert 'private_test_token' not in str(kwargs['metadata'])
    assert setup.write.call_args.args[1]['$set']['recipients.$.identity_session_id'] == 'vs_test'


@pytest.mark.parametrize('status', ['processing', 'requires_input', 'canceled'])
def test_incomplete_check_never_unlocks(setup, status):
    setup.recipient['identity_session_id'] = 'vs_test'
    setup.session['status'] = status
    assert asyncio.run(identity.check_identity(setup.env, setup.recipient))['verified'] is False
    setup.write.assert_not_awaited()


def test_verified_name_match_unlocks_without_storing_identity_data(setup):
    setup.recipient['identity_session_id'] = 'vs_test'
    result = asyncio.run(identity.check_identity(setup.env, setup.recipient))
    assert result['verified'] is True
    update = setup.write.call_args.args[1]
    assert update['$set']['recipients.$.auth_verified'] is True
    assert 'verified_outputs' not in str(update)
    assert 'first_name' not in str(update)


def test_different_person_never_unlocks(setup):
    setup.recipient['identity_session_id'] = 'vs_test'
    setup.session['verified_outputs']['first_name'] = 'Other'
    assert asyncio.run(identity.check_identity(setup.env, setup.recipient))['status'] == 'name_mismatch'
    setup.write.assert_not_awaited()


@pytest.mark.parametrize('bad', ['test_mode', 'wrong_envelope'])
def test_session_binding_and_live_mode_required(setup, bad):
    setup.recipient['identity_session_id'] = 'vs_test'
    if bad == 'test_mode':
        setup.session['livemode'] = False
    else:
        setup.session['metadata']['envelope_id'] = 'other_envelope'
    with pytest.raises(HTTPException) as exc:
        asyncio.run(identity.check_identity(setup.env, setup.recipient))
    assert exc.value.status_code == 409
    setup.write.assert_not_awaited()


def test_disabled_configuration_never_contacts_provider(setup, monkeypatch):
    monkeypatch.setenv('IDENTITY_VERIFICATION_ENABLED', 'false')
    with pytest.raises(HTTPException) as exc:
        asyncio.run(identity.start_identity(setup.env, setup.recipient))
    assert exc.value.status_code == 503
    setup.create.assert_not_called()


def test_changed_signing_request_cannot_be_unlocked(setup):
    setup.recipient['identity_session_id'] = 'vs_test'
    setup.write.return_value.matched_count = 0
    with pytest.raises(HTTPException) as exc:
        asyncio.run(identity.check_identity(setup.env, setup.recipient))
    assert exc.value.status_code == 409


def test_test_key_cannot_enable_production(setup, monkeypatch):
    monkeypatch.setenv('STRIPE_IDENTITY_API_KEY', 'sk_test_mock')
    monkeypatch.setenv('DEV_MODE', 'false')
    assert identity.identity_available() is False
    monkeypatch.setenv('DEV_MODE', 'true')
    assert identity.identity_available() is True


def test_identity_gate_blocks_pdf_before_verification():
    from server import _assert_signer_file_access
    env = {'status': 'sent', 'signing_order': 'parallel', 'recipients': []}
    recipient = {'status': 'pending', 'auth_method': 'identity', 'auth_verified': False}
    with pytest.raises(HTTPException) as exc:
        _assert_signer_file_access(env, recipient)
    assert exc.value.status_code == 403


@pytest.mark.parametrize('state', ['declined', 'signed'])
def test_completed_recipient_cannot_start_identity(setup, monkeypatch, state):
    import server
    setup.recipient['status'] = state
    setup.env['signing_order'] = 'parallel'
    monkeypatch.setattr(server, '_find_by_token', AsyncMock(return_value=(setup.env, setup.recipient)))
    monkeypatch.setattr(server, 'maybe_expire', AsyncMock(return_value=setup.env))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(server._identity_signer('token'))
    assert exc.value.status_code == 403


def test_provider_failure_does_not_unlock(setup, monkeypatch):
    setup.recipient['identity_session_id'] = 'vs_test'
    monkeypatch.setattr(identity.stripe.identity.VerificationSession, 'retrieve', Mock(side_effect=identity.stripe.error.APIConnectionError('offline')))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(identity.check_identity(setup.env, setup.recipient))
    assert exc.value.status_code == 502
    setup.write.assert_not_awaited()
