"""Integration tests for PDF↔Word conversion (hits live API on :8001)."""
import io
import os
import zipfile

import fitz
import pytest
import requests

API_BASE = os.environ.get("TEST_API_BASE", "http://127.0.0.1:8001")
PRO_EMAIL = os.environ.get("E2E_USER_EMAIL", "pro@civicbot.co.uk")
PRO_PASSWORD = os.environ.get("E2E_USER_PASSWORD", "CivicSign2026!Pro")


def _api_available() -> bool:
    try:
        r = requests.get(f"{API_BASE}/api/health", timeout=3)
        return r.status_code == 200
    except requests.RequestException:
        return False


def _libreoffice_available() -> bool:
    try:
        from pdf_service import _resolve_soffice
        _resolve_soffice()
        return True
    except FileNotFoundError:
        return False


pytestmark = pytest.mark.skipif(not _api_available(), reason="API not running on :8001")


def _make_text_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "PDF to Word integration test", fontsize=14)
    return doc.tobytes()


def _minimal_docx() -> bytes:
    """Tiny valid DOCX (zip with minimal word/document.xml)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            "<w:body><w:p><w:r><w:t>Word to PDF test</w:t></w:r></w:p></w:body>"
            "</w:document>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="word/document.xml"/>'
            "</Relationships>",
        )
    return buf.getvalue()


def _login_pro() -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def _workspace(s: requests.Session, data: bytes, name: str, mime: str) -> str:
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": (name, io.BytesIO(data), mime)},
    )
    assert r.status_code == 200, r.text
    return r.json()["workspace_id"]


def test_pdf_to_word_returns_docx():
    s = _login_pro()
    ws = _workspace(s, _make_text_pdf(), "convert-test.pdf", "application/pdf")
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/pdf-to-word")
    assert r.status_code == 200, r.text[:500]
    assert r.content[:2] == b"PK"
    assert "docx" in (r.headers.get("Content-Disposition") or "").lower()


@pytest.mark.skipif(not _libreoffice_available(), reason="LibreOffice not installed (required for Word→PDF)")
def test_word_to_pdf_returns_pdf():
    s = _login_pro()
    ws = _workspace(
        s,
        _minimal_docx(),
        "convert-test.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/word-to-pdf")
    assert r.status_code == 200, r.text[:500]
    assert r.content[:4] == b"%PDF"
    doc = fitz.open(stream=r.content, filetype="pdf")
    assert len(doc) >= 1
    doc.close()


def test_word_to_pdf_rejects_pdf_workspace():
    s = _login_pro()
    ws = _workspace(s, _make_text_pdf(), "not-word.pdf", "application/pdf")
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/word-to-pdf")
    assert r.status_code == 400
    assert "Word" in r.json().get("detail", "")