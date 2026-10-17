"""Stripe Identity provider: status mapping, webhook authentication, caps."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from idv.provider import ProviderError  # noqa: E402
from idv.stripe_identity import (  # noqa: E402
    StripeIdentityProvider,
    configured,
    map_session,
    webhook_secret,
)
from idv.service import monthly_cap  # noqa: E402

CHECKS = ("document", "liveness", "face_match")


def _session(status, **extra):
    return {"id": "vs_test123", "status": status, **extra}


def test_verified_session_passes_supported_checks():
    result = map_session(
        _session("verified", verified_outputs={"first_name": "Sian", "last_name": "Patel"}),
        CHECKS,
    )
    assert result.status == "verified"
    assert result.document_name == "Sian Patel"
    assert all(result.checks[c] == "passed" for c in CHECKS)


def test_chip_is_recorded_as_skipped_not_passed():
    # Stripe cannot read an NFC chip; claiming it passed would overstate evidence.
    result = map_session(
        _session("verified", verified_outputs={"first_name": "Sian", "last_name": "Patel"}),
        ("document", "chip"),
    )
    assert result.checks["chip"] == "skipped"
    assert result.checks["document"] == "passed"


def test_requires_input_with_error_is_a_failure():
    result = map_session(
        _session("requires_input", last_error={"code": "document_unverified_other",
                                               "reason": "The document could not be verified"}),
        CHECKS,
    )
    assert result.status == "failed"
    assert result.failure_reason == "The document could not be verified"
    assert all(v == "failed" for v in result.checks.values())


def test_requires_input_without_error_is_still_pending():
    # The signer simply has not finished yet; this must not lock them out.
    assert map_session(_session("requires_input"), CHECKS).status == "pending"


def test_processing_is_pending():
    assert map_session(_session("processing"), CHECKS).status == "pending"


def test_canceled_is_expired():
    result = map_session(_session("canceled"), CHECKS)
    assert result.status == "expired"
    assert result.failure_reason


def test_verified_without_outputs_has_no_name():
    # Name matching then fails closed rather than silently passing.
    assert map_session(_session("verified"), CHECKS).document_name is None


def test_webhook_requires_a_signature_header():
    with pytest.raises(ProviderError, match="Stripe-Signature"):
        StripeIdentityProvider().verify_webhook(b"{}", {})


def test_webhook_secret_falls_back_to_billing_secret(monkeypatch):
    monkeypatch.delenv("STRIPE_IDENTITY_WEBHOOK_SECRET", raising=False)
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_billing")
    assert webhook_secret() == "whsec_billing"


def test_webhook_secret_prefers_the_identity_secret(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_billing")
    monkeypatch.setenv("STRIPE_IDENTITY_WEBHOOK_SECRET", "whsec_identity")
    assert webhook_secret() == "whsec_identity"


def test_webhook_secret_missing_is_an_error(monkeypatch):
    monkeypatch.delenv("STRIPE_IDENTITY_WEBHOOK_SECRET", raising=False)
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    with pytest.raises(ProviderError):
        webhook_secret()


def test_configured_follows_the_api_key(monkeypatch):
    monkeypatch.delenv("STRIPE_API_KEY", raising=False)
    assert configured() is False
    monkeypatch.setenv("STRIPE_API_KEY", "sk_test_123")
    assert configured() is True


@pytest.mark.parametrize("value,expected", [("250", 250), ("0", 0), ("nonsense", 100)])
def test_monthly_cap_reads_env(monkeypatch, value, expected):
    monkeypatch.setenv("IDV_MONTHLY_CAP", value)
    assert monthly_cap() == expected
