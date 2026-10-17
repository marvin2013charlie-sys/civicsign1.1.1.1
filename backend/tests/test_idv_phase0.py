"""Phase 0 identity verification: provider contract, name matching, evidence."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from idv.mock import MockProvider  # noqa: E402
from idv.provider import ALL_CHECKS, DEFAULT_CHECKS  # noqa: E402
from idv.service import (  # noqa: E402
    evidence_for_certificate,
    names_match,
    normalise_checks,
)


def _session(provider, email, checks=DEFAULT_CHECKS):
    return provider.start_session(
        verification_id="idv_test01",
        signer_name="Sian Patel",
        signer_email=email,
        required_checks=checks,
        return_url="https://civicsign.co.uk/sign/tok",
    )


def test_mock_session_is_pending_until_completed():
    p = MockProvider()
    s = _session(p, "sian@example.com")
    assert p.fetch_result(s.provider_ref).status == "pending"


def test_mock_passes_by_default():
    p = MockProvider()
    s = _session(p, "sian@example.com")
    result = p.complete(s.provider_ref)
    assert result.status == "verified"
    assert set(result.checks) == set(DEFAULT_CHECKS)
    assert all(v == "passed" for v in result.checks.values())


@pytest.mark.parametrize("email,expected", [
    ("someone+idv-fail@example.com", "failed"),
    ("someone+idv-expire@example.com", "expired"),
])
def test_mock_outcomes_are_addressable(email, expected):
    p = MockProvider()
    s = _session(p, email)
    result = p.complete(s.provider_ref)
    assert result.status == expected
    assert result.failure_reason


def test_unknown_session_reads_as_expired():
    assert MockProvider().fetch_result("mock_nope").status == "expired"


def test_mock_refuses_webhooks():
    with pytest.raises(NotImplementedError):
        MockProvider().verify_webhook(b"{}", {})


@pytest.mark.parametrize("requested,expected", [
    (None, DEFAULT_CHECKS),
    ([], DEFAULT_CHECKS),
    (["document"], ("document",)),
    (["DOCUMENT", " chip "], ("document", "chip")),
    (["nonsense"], DEFAULT_CHECKS),
])
def test_normalise_checks(requested, expected):
    assert normalise_checks(requested) == expected


def test_default_checks_exclude_chip():
    # Chip reading needs a native client, so it must be opted into.
    assert "chip" in ALL_CHECKS and "chip" not in DEFAULT_CHECKS


@pytest.mark.parametrize("document,recipient,expected", [
    ("Sian Patel", "Sian Patel", True),
    ("SIAN PATEL", "sian patel", True),
    ("Sian Amara Patel", "Sian Patel", True),      # extra forename is fine
    ("Sian O'Connor-Patel", "Sian OConnor Patel", True),
    ("Sian Patel", "Sian Amara Patel", False),     # missing a recipient name
    ("Daniel Patel", "Sian Patel", False),
    (None, "Sian Patel", False),
    ("Sian Patel", "", False),
])
def test_names_match(document, recipient, expected):
    assert names_match(document, recipient) is expected


def test_evidence_only_for_verified_records():
    assert evidence_for_certificate(None) is None
    assert evidence_for_certificate({"status": "failed"}) is None


def test_evidence_contains_no_biometrics():
    record = {
        "verification_id": "idv_abc",
        "status": "verified",
        "provider": "mock",
        "checks": {"document": "passed", "liveness": "passed", "face_match": "failed"},
        "name_match": True,
        "completed_at": "2026-10-17T12:00:00+00:00",
        "provider_ref": "mock_idv_abc",
    }
    evidence = evidence_for_certificate(record)
    assert evidence["checks_passed"] == ["document", "liveness"]
    assert evidence["name_match"] is True
    assert "provider_ref" not in evidence
    serialised = str(evidence).lower()
    for leaked in ("image", "photo", "selfie", "biometric", "data:"):
        assert leaked not in serialised
