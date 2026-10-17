"""CivicSign's own verification: what it proves, and what it refuses to claim."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from idv.civicsign_provider import (  # noqa: E402
    CivicSignProvider,
    evaluate_mrz,
    unsupported,
)
from idv.mrz import check_digit  # noqa: E402
from idv.provider import ProviderError  # noqa: E402

EXPIRED_SPECIMEN = ("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n"
                    "L898902C36UTO7408122F1204159ZE184226B<<<<<10")


def build_td3(surname="PATEL", given="SIAN", expiry="350415", doc_number="123456789",
              nationality="GBR", dob="900101", sex="F", issuing="GBR"):
    """A well-formed TD3 with correct check digits, for the pass path."""
    name_field = f"{surname}<<{given}".ljust(39, "<")
    line1 = f"P<{issuing}{name_field}"[:44]
    personal = "<" * 14
    doc = doc_number.ljust(9, "<")
    body = (f"{doc}{check_digit(doc)}{nationality}{dob}{check_digit(dob)}{sex}"
            f"{expiry}{check_digit(expiry)}{personal}{check_digit(personal)}")
    composite = doc + check_digit(doc) + dob + check_digit(dob) + expiry + check_digit(expiry) + personal + check_digit(personal)
    return f"{line1}\n{body}{check_digit(composite)}"


def test_valid_in_date_document_passes():
    result, summary = evaluate_mrz(build_td3(), "cs_test")
    assert result.status == "verified"
    assert result.checks == {"document": "passed"}
    assert result.document_name == "SIAN PATEL"
    assert summary["issuing_state"] == "GBR"
    assert summary["mrz_valid"] is True


def test_expired_document_fails_even_when_well_formed():
    result, summary = evaluate_mrz(EXPIRED_SPECIMEN, "cs_test")
    assert result.status == "failed"
    assert "expired" in result.failure_reason.lower()
    assert summary == {}


def test_tampered_document_number_fails():
    good = build_td3()
    line1, line2 = good.split("\n")
    tampered = "9" + line2[1:]
    result, _ = evaluate_mrz(f"{line1}\n{tampered}", "cs_test")
    assert result.status == "failed"
    assert "check digit" in result.failure_reason.lower()


@pytest.mark.parametrize("raw", ["", "not an mrz at all", "P<GBR\n123"])
def test_unreadable_input_fails_cleanly(raw):
    result, _ = evaluate_mrz(raw, "cs_test")
    assert result.status == "failed"
    assert result.failure_reason


def test_stored_summary_holds_no_document_number_or_birth_date():
    _, summary = evaluate_mrz(build_td3(doc_number="987654321", dob="900101"), "cs_test")
    assert summary["document_number_last4"] == "4321"
    assert "987654321" not in str(summary)
    assert "900101" not in str(summary)


@pytest.mark.parametrize("checks,expected", [
    (("document",), []),
    (("document", "liveness"), ["liveness"]),
    (("face_match", "chip"), ["face_match", "chip"]),
])
def test_unsupported_checks_are_named(checks, expected):
    assert unsupported(checks) == expected


def test_session_refuses_checks_it_cannot_perform():
    # Accepting the job and skipping the check would overstate the certificate.
    with pytest.raises(ProviderError, match="licensed provider"):
        CivicSignProvider().start_session(
            verification_id="idv_1", signer_name="Sian Patel",
            signer_email="sian@example.com",
            required_checks=("document", "liveness"),
            return_url="https://civicsign.co.uk/sign/tok",
        )


def test_session_starts_for_document_only():
    session = CivicSignProvider().start_session(
        verification_id="idv_1", signer_name="Sian Patel", signer_email="sian@example.com",
        required_checks=("document",), return_url="https://civicsign.co.uk/sign/tok",
    )
    assert session.provider == "civicsign"
    assert session.provider_ref == "cs_idv_1"
    # The signer stays inside CivicSign — no third-party hosted flow.
    assert session.redirect_url == "https://civicsign.co.uk/sign/tok"


def test_result_stays_pending_until_a_document_is_submitted():
    assert CivicSignProvider().fetch_result("cs_idv_1").status == "pending"


def test_no_webhooks():
    with pytest.raises(NotImplementedError):
        CivicSignProvider().verify_webhook(b"{}", {})
