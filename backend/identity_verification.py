"""Embedded Veriff signer ID checks; never store ID images or extracted identity data."""
import hashlib
import os
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
import hmac
import json
import uuid
from fastapi import HTTPException
from db import db
from security_utils import is_dev_mode


def _origin(value):
    parsed = urlparse(value)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment):
        return None
    if not any(parsed.hostname == domain or parsed.hostname.endswith('.' + domain)
               for domain in ('veriff.com', 'veriff.me')):
        return None
    return value.rstrip('/')


def identity_available():
    return bool(os.environ.get('IDENTITY_VERIFICATION_ENABLED', '').lower() == 'true'
        and os.environ.get('VERIFF_API_KEY') and os.environ.get('VERIFF_SHARED_SECRET')
        and _origin(os.environ.get('VERIFF_API_BASE', ''))
        and _origin(os.environ.get('VERIFF_SESSION_ORIGIN', ''))
        and os.environ.get('VERIFF_IDV_PROFILE_CONFIRMED') == 'true'
        and (os.environ.get('VERIFF_ENVIRONMENT') == 'live' or is_dev_mode()))


def _require_provider():
    if not identity_available():
        raise HTTPException(503, 'Photo ID verification is not available. Contact the sender for help.')


def _signature(value):
    return hmac.new(os.environ['VERIFF_SHARED_SECRET'].encode(), value, hashlib.sha256).hexdigest()


async def _request(method, path, payload=None, session_id=None):
    _require_provider()
    body = json.dumps(payload, separators=(',', ':')).encode() if payload is not None else b''
    signed = session_id.encode() if session_id else body
    headers = {'X-AUTH-CLIENT': os.environ['VERIFF_API_KEY'],
               'X-HMAC-SIGNATURE': _signature(signed), 'Content-Type': 'application/json'}
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            response = await client.request(method, _origin(os.environ['VERIFF_API_BASE']) + path,
                                            content=body if payload is not None else None, headers=headers)
        response.raise_for_status()
        received = response.headers.get('x-hmac-signature', '')
        if not hmac.compare_digest(received.lower(), _signature(response.content)):
            raise HTTPException(502, 'Identity provider response could not be authenticated.')
        data = response.json()
        if not isinstance(data, dict) or data.get('status') != 'success':
            raise ValueError('Unexpected provider response')
        return data
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'The identity provider is unavailable. Try checking the result again shortly.')


def _name(value):
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in unicodedata.normalize('NFKC', value).casefold()).split())


def _filter(env, recipient):
    return {'envelope_id': env['envelope_id'], 'status': {'$in': ['sent', 'viewed']},
            'recipients': {'$elemMatch': {'recipient_id': recipient['recipient_id'],
                'access_token': recipient['access_token'], 'auth_method': 'identity'}}}


def _binding(env, recipient):
    return hashlib.sha256((env['envelope_id'] + ':' + recipient['recipient_id'] + ':' + recipient['access_token']).encode()).hexdigest()


def _session_url(url):
    parsed = urlparse(url or '')
    expected = _origin(os.environ.get('VERIFF_SESSION_ORIGIN', ''))
    if (not expected or f'{parsed.scheme}://{parsed.netloc}' != expected
            or parsed.username or parsed.password):
        raise HTTPException(502, 'Identity provider returned an invalid verification address.')
    return url


async def start_identity(env, recipient):
    _require_provider()
    if recipient.get('identity_provider') == 'veriff' and recipient.get('identity_session_url'):
        return {'status': 'requires_input', 'url': _session_url(recipient['identity_session_url'])}
    # A database claim prevents parallel clicks/workers creating multiple paid sessions.
    query = _filter(env, recipient)
    query['recipients']['$elemMatch']['identity_creation_started'] = {'$ne': True}
    result = await db.envelopes.update_one(query, {'$set': {'recipients.$.identity_creation_started': True}})
    if not result.matched_count:
        raise HTTPException(409, 'Verification is already starting. Reload shortly. If it remains unavailable, contact the sender.')
    # An ambiguous provider failure retains the claim, avoiding automatic duplicate charges.
    data = await _request('POST', '/v1/sessions', {'verification': {'vendorData': _binding(env, recipient)}})
    session = data.get('verification') or {}
    try:
        session_id = str(uuid.UUID(session['id']))
        url = _session_url(session.get('url'))
    except (ValueError, KeyError, TypeError):
        raise HTTPException(502, 'Identity provider returned an invalid session.')
    result = await db.envelopes.update_one(_filter(env, recipient), {'$set': {
        'recipients.$.identity_session_id': session_id,
        'recipients.$.identity_session_url': url,
        'recipients.$.identity_provider': 'veriff'}})
    if not result.matched_count:
        raise HTTPException(409, 'The signing request changed. Reload the page.')
    return {'status': 'requires_input', 'url': url}


async def check_identity(env, recipient):
    _require_provider()
    if recipient.get('auth_verified'):
        return {'verified': True, 'status': 'verified'}
    session_id = recipient.get('identity_session_id')
    if not session_id:
        return {'verified': False, 'status': 'not_started'}
    if recipient.get('identity_provider') != 'veriff':
        raise HTTPException(409, 'This verification requires a new signing request.')
    try:
        session_id = str(uuid.UUID(session_id))
    except ValueError:
        raise HTTPException(409, 'Invalid identity session.')
    data = await _request('GET', f'/v1/sessions/{session_id}/decision', session_id=session_id)
    session = data.get('verification')
    if not session:
        return {'verified': False, 'status': 'processing'}
    if session.get('id') != session_id or session.get('vendorData') != _binding(env, recipient):
        raise HTTPException(409, 'Identity verification does not match this signing request.')
    if session.get('code') != 9001 or session.get('status') != 'approved':
        return {'verified': False, 'status': session.get('status', 'requires_input')}
    if (session.get('document') or {}).get('type') not in ('PASSPORT', 'DRIVERS_LICENSE'):
        return {'verified': False, 'status': 'unsupported_document'}
    outputs = session.get('person') or {}
    verified_name = ' '.join(filter(None, [outputs.get('firstName'), outputs.get('lastName')]))
    if not verified_name or _name(verified_name) != _name(recipient['name']):
        return {'verified': False, 'status': 'name_mismatch',
                'message': 'The ID name does not match the signer name. Ask the sender to use your full legal name on a new request.'}
    checked_at = datetime.now(timezone.utc).isoformat()
    query = _filter(env, recipient)
    query['recipients']['$elemMatch'].update({'identity_session_id': session_id, 'auth_verified': {'$ne': True}})
    result = await db.envelopes.update_one(query, {'$set': {
        'recipients.$.auth_verified': True, 'recipients.$.identity_verified_at': checked_at,
        'recipients.$.identity_provider': 'veriff'}, '$push': {'audit_events': {
            'actor': recipient['email'], 'action': 'Photo ID verified', 'timestamp': checked_at,
            'ip': '-', 'detail': 'Veriff IDV approved; supported photo ID and signer name matched.'}}})
    if not result.matched_count:
        raise HTTPException(409, 'The signing request changed. Reload the page.')
    return {'verified': True, 'status': 'verified'}
