"""Unit tests for sealed document hashing, package seal, and metadata verify."""
import fitz

from pdf_service import (
    finalize_envelope,
    verify_completed_pdf_seal,
    extract_seal_metadata,
    compute_package_hash,
)


def _blank_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Contract body", fontsize=14)
    out = doc.tobytes()
    doc.close()
    return out


def _finalize():
    meta = {
        "envelope_id": "env_seal_unit",
        "title": "Unit Seal Doc",
        "status": "Completed",
        "signature_level": "basic",
    }
    events = [
        {"timestamp": "2026-01-01T00:00:00Z", "actor": "alice@example.com",
         "action": "Signed", "ip": "1.2.3.4"},
    ]
    return finalize_envelope(_blank_pdf(), [], meta, events)


def test_finalize_returns_dual_hashes_and_metadata():
    out, doc_hash, spc, pkg, seal_meta = _finalize()
    assert len(out) > 500
    assert len(doc_hash) == 64
    assert len(pkg) == 64
    assert spc >= 1
    assert seal_meta["author"] == "CivicSign"
    assert seal_meta["creator"] == "CivicSign"
    assert seal_meta["producer"] == "CivicSign Seal Engine"
    assert "env_seal_unit" in seal_meta["subject"]
    assert seal_meta["page_count"] >= 2
    assert compute_package_hash(out) == pkg


def test_intact_file_accepts_as_proof():
    out, doc_hash, spc, pkg, seal_meta = _finalize()
    r = verify_completed_pdf_seal(
        out,
        doc_hash,
        signed_page_count=spc,
        expected_package_hash=pkg,
        expected_seal_metadata=seal_meta,
        source="uploaded",
    )
    assert r["accept_as_proof"] is True
    assert r["content_match"] is True
    assert r["package_match"] is True
    assert r["metadata_match"] is True
    assert r["proof_verdict"] == "accept"
    assert r["source"] == "uploaded"


def test_body_edit_rejects():
    out, doc_hash, spc, pkg, seal_meta = _finalize()
    doc = fitz.open(stream=out, filetype="pdf")
    doc[0].insert_text((100, 100), "TAMPERED")
    edited = doc.tobytes()
    doc.close()
    r = verify_completed_pdf_seal(
        edited, doc_hash, signed_page_count=spc,
        expected_package_hash=pkg, expected_seal_metadata=seal_meta, source="uploaded",
    )
    assert r["accept_as_proof"] is False
    assert r["proof_verdict"] == "reject"


def test_certificate_edit_rejects_package():
    out, doc_hash, spc, pkg, seal_meta = _finalize()
    doc = fitz.open(stream=out, filetype="pdf")
    doc[-1].insert_text((50, 50), "FAKE CERT NOTE")
    edited = doc.tobytes()
    doc.close()
    r = verify_completed_pdf_seal(
        edited, doc_hash, signed_page_count=spc,
        expected_package_hash=pkg, expected_seal_metadata=seal_meta, source="uploaded",
    )
    assert r["content_match"] is True  # signed body unchanged
    assert r["package_match"] is False
    assert r["accept_as_proof"] is False


def test_metadata_edit_rejects():
    out, doc_hash, spc, pkg, seal_meta = _finalize()
    doc = fitz.open(stream=out, filetype="pdf")
    m = dict(doc.metadata or {})
    m["author"] = "Not CivicSign"
    m["producer"] = "Evil Editor"
    doc.set_metadata(m)
    edited = doc.tobytes()
    doc.close()
    r = verify_completed_pdf_seal(
        edited, doc_hash, signed_page_count=spc,
        expected_package_hash=pkg, expected_seal_metadata=seal_meta, source="uploaded",
    )
    assert r["accept_as_proof"] is False
    assert r["metadata_match"] is False
    fields = {f["field"] for f in r["metadata"]["mismatched_fields"]}
    assert "author" in fields or "producer" in fields


def test_extract_seal_metadata_roundtrip():
    out, *_rest = _finalize()
    meta = extract_seal_metadata(out)
    assert meta["title"] == "Unit Seal Doc"
    assert meta["page_count"] >= 2
