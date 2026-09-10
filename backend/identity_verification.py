"""Provider-hosted signer ID checks; never store ID images or extracted identity data."""
import asyncio
import hashlib
import os
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlparse

import stripe
from fastapi import HTTPException
from db import db
from security_utils import is_dev_mode


def identity_available():
    key = os.environ.get('STRIPE_IDENTITY_API_KEY', '')
    return (os.environ.get('IDENTITY_VERIFICATION_ENABLED', '').lower() == 'true'
            and (key.startswith('sk_live_') or (is_dev_mode() and key.startswith('sk_test_'))))


def _key():
    if not identity_available():
        raise HTTPException(503, 'Photo ID verification is not available. Contact the sender for help.')
    return os.environ['STRIPE_IDENTITY_API_KEY']


def _name(value):
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in unicodedata.normalize('NFKC', value).casefold()).split())


def _scope(env, recipient):
    return {'envelope_id': env['envelope_id'], 'recipient_id': recipient['recipient_id']}


def _filter(env, recipient):
    return {'envelope_id': env['envelope_id'], 'status': {'$in': ['sent', 'viewed']},
            'recipients': {'$elemMatch': {'recipient_id': recipient['recipient_id'],
                'access_token': recipient['access_token'], 'auth_method': 'identity'}}}


async def _retrieve(session_id, key):
    try:
        return await asyncio.to_thread(stripe.identity.VerificationSession.retrieve, session_id, api_key=key)
    except stripe.error.StripeError:
        raise HTTPException(502, 'The identity provider is unavailable. Try again shortly.')


async def start_identity(env, recipient):
    key = _key()
    session_id = recipient.get('identity_session_id')
    if session_id:
        session = await _retrieve(session_id, key)
    else:
        base = os.environ.get('IDENTITY_RETURN_ORIGIN', '').rstrip('/')
        parsed = urlparse(base)
        if parsed.scheme != 'https' or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
            raise HTTPException(503, 'Identity verification return address is not configured.')
        # Hash the link token into the idempotency key; never send the token as metadata.
        attempt = hashlib.sha256(recipient['access_token'].encode()).hexdigest()
        try:
            session = await asyncio.to_thread(
                stripe.identity.VerificationSession.create,
                type='document', options={'document': {'allowed_types': ['passport', 'driving_license'],
                    'require_matching_selfie': True, 'require_live_capture': True}},
                metadata=_scope(env, recipient),
                return_url=f"{base}/sign/{recipient['access_token']}",
                idempotency_key=f'identity-{attempt}', api_key=key,
            )
        except stripe.error.StripeError:
            raise HTTPException(502, 'Could not start identity verification. Try again shortly.')
        result = await db.envelopes.update_one(_filter(env, recipient),
            {'$set': {'recipients.$.identity_session_id': session['id']}})
        if not result.matched_count:
            raise HTTPException(409, 'The signing request changed. Reload the page.')
    url = session.get('url')
    if session.get('status') != 'requires_input' or not url:
        return {'status': session.get('status'), 'url': None}
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'verify.stripe.com':
        raise HTTPException(502, 'The identity provider returned an invalid verification address.')
    return {'status': 'requires_input', 'url': url}


async def check_identity(env, recipient):
    key = _key()
    if recipient.get('auth_verified'):
        return {'verified': True, 'status': 'verified'}
    session_id = recipient.get('identity_session_id')
    if not session_id:
        return {'verified': False, 'status': 'not_started'}
    session = await _retrieve(session_id, key)
    if bool(session.get('livemode')) != key.startswith('sk_live_') or dict(session.get('metadata') or {}) != _scope(env, recipient):
        raise HTTPException(409, 'Identity verification does not match this signing request.')
    if session.get('status') != 'verified':
        return {'verified': False, 'status': session.get('status', 'requires_input')}
    outputs = session.get('verified_outputs') or {}
    verified_name = ' '.join(filter(None, [outputs.get('first_name'), outputs.get('last_name')]))
    if not verified_name or _name(verified_name) != _name(recipient['name']):
        return {'verified': False, 'status': 'name_mismatch',
                'message': 'The ID name does not match the signer name. Ask the sender to use your full legal name on a new request.'}
    checked_at = datetime.now(timezone.utc).isoformat()
    query = _filter(env, recipient)
    query['recipients']['$elemMatch'].update({'identity_session_id': session_id, 'auth_verified': {'$ne': True}})
    result = await db.envelopes.update_one(query, {'$set': {
        'recipients.$.auth_verified': True, 'recipients.$.identity_verified_at': checked_at,
        'recipients.$.identity_provider': 'stripe'}, '$push': {'audit_events': {
            'actor': recipient['email'], 'action': 'Photo ID verified', 'timestamp': checked_at,
            'ip': '-', 'detail': 'Stripe Identity: document and selfie verified; signer name matched.'}}})
    if not result.matched_count:
        raise HTTPException(409, 'The signing request changed. Reload the page.')
    return {'verified': True, 'status': 'verified'}
