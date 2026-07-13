"""Integration platform: webhook signing, events, envelope projection."""
import integrations


def test_webhook_events_include_lifecycle():
    assert "envelope.sent" in integrations.WEBHOOK_EVENTS
    assert "envelope.viewed" in integrations.WEBHOOK_EVENTS
    assert "envelope.voided" in integrations.WEBHOOK_EVENTS


def test_hmac_signature_is_deterministic():
    body = b'{"event":"envelope.sent"}'
    sig1 = integrations._sign_payload("test-secret", body)
    sig2 = integrations._sign_payload("test-secret", body)
    assert sig1 == sig2
    assert len(sig1) == 64


def test_webhook_body_has_delivery_id():
    body = integrations._build_webhook_body("whd_abc", "envelope.completed", {"envelope_id": "env_1"})
    assert b'"id": "whd_abc"' in body or b'"id":"whd_abc"' in body
    assert b"envelope.completed" in body
    assert b"api_version" in body


def test_envelope_projection_redacts_tokens():
    env = {
        "envelope_id": "env_1",
        "title": "Test",
        "status": "sent",
        "recipients": [
            {"recipient_id": "r1", "name": "A", "email": "a@x.com", "access_token": "secret", "status": "pending"},
        ],
    }
    out = integrations._envelope_api_projection(env)
    assert "access_token" not in str(out)
    assert out["recipients"][0]["email"] == "a@x.com"