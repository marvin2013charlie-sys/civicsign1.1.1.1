"""Word-sourced envelopes: signers may only complete signature fields."""
from server import (
    SIGNER_SIGN_ONLY_FIELD_TYPES,
    is_sign_only_document,
    signer_field_editable,
)


def _env(file_type="pdf"):
    return {
        "status": "sent",
        "document": {"file_type": file_type},
        "recipients": [{"recipient_id": "r1", "status": "viewed"}],
    }


def _field(**overrides):
    base = {"field_id": "f1", "recipient_id": "r1", "type": "text", "required": True}
    base.update(overrides)
    return base


def _recipient(**overrides):
    base = {"recipient_id": "r1", "status": "viewed"}
    base.update(overrides)
    return base


def test_is_sign_only_document_for_docx():
    assert is_sign_only_document(_env("docx")) is True
    assert is_sign_only_document(_env("pdf")) is False


def test_signer_may_edit_signature_on_docx():
    env = _env("docx")
    rec = _recipient()
    assert signer_field_editable(_field(type="signature"), rec, env, True) is True
    assert signer_field_editable(_field(type="initials"), rec, env, True) is True


def test_signer_cannot_edit_text_on_docx():
    env = _env("docx")
    rec = _recipient()
    assert signer_field_editable(_field(type="text"), rec, env, True) is False
    assert signer_field_editable(_field(type="checkbox"), rec, env, True) is False
    assert signer_field_editable(_field(type="fullname"), rec, env, True) is False


def test_pdf_allows_all_assigned_fields():
    env = _env("pdf")
    rec = _recipient()
    assert signer_field_editable(_field(type="text"), rec, env, True) is True
    assert signer_field_editable(_field(type="checkbox"), rec, env, True) is True


def test_sign_only_field_types_are_signature_and_initials():
    assert SIGNER_SIGN_ONLY_FIELD_TYPES == frozenset({"signature", "initials"})