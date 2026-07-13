"""Stats totals count only envelopes sent for signature."""
from server import is_sent_envelope


def test_sent_envelope_requires_sent_at():
    assert is_sent_envelope({"status": "completed", "sent_at": "2026-07-01T10:00:00Z"}) is True
    assert is_sent_envelope({"status": "sent", "sent_at": "2026-07-01T10:00:00Z"}) is True


def test_draft_and_saved_pdfs_are_not_sent():
    assert is_sent_envelope({"status": "draft"}) is False
    assert is_sent_envelope({"status": "draft", "manage_pdf_tool": "watermark"}) is False