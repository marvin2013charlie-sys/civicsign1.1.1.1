"""Unit + API tests for AI metadata & integrity detection."""
import io
import os
import zipfile

import fitz
import pytest
import requests

from ai_metadata_check import analyze_ai_metadata, build_report_pdf

API_BASE = os.environ.get("TEST_API_BASE", "http://127.0.0.1:8001")
PRO_EMAIL = os.environ.get("E2E_USER_EMAIL", "pro@civicbot.co.uk")
PRO_PASSWORD = os.environ.get("E2E_USER_PASSWORD", "CivicSign2026!Pro")


def _pdf_with_meta(creator: str, producer: str, body: str = "Normal letter text.") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), body, fontsize=12)
    doc.set_metadata({"creator": creator, "producer": producer, "author": creator})
    return doc.tobytes()


def test_pdf_detects_chatgpt_metadata():
    report = analyze_ai_metadata(
        _pdf_with_meta("ChatGPT", "OpenAI PDF Generator"),
        filename="ai-draft.pdf",
    )
    assert report["file_type"] == "pdf"
    assert report["verdict"] in ("likely_ai", "possible_ai")
    assert report["signal_count"] >= 1


def test_pdf_binary_scan_without_info_header():
    """AI string buried in PDF — simulates stripped Info dict."""
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Employment offer", fontsize=12)
    data = bytearray(doc.tobytes())
    doc.close()
    data.extend(b"\n% hidden marker openai chatgpt export\n")
    report = analyze_ai_metadata(bytes(data), filename="hidden.pdf")
    assert any(s.get("category") == "binary" for s in report["signals"])


def test_pdf_detects_ai_body_phrases():
    body = (
        "Dear Sir, As an AI language model I cannot access your systems. "
        "Here is a draft employment letter. Hope this helps!"
    )
    report = analyze_ai_metadata(
        _pdf_with_meta("macOS PDF", "macOS Version 14.0 Quartz PDFContext", body=body),
        filename="chat-export.pdf",
    )
    assert report["verdict"] in ("likely_ai", "possible_ai")
    assert any(s.get("category") == "content" for s in report["signals"])


def test_pdf_print_export_structure_signal():
    report = analyze_ai_metadata(
        _pdf_with_meta("", "Skia/PDF m123 Google Chrome"),
        filename="printed.pdf",
    )
    assert any("print" in s.get("indicator", "").lower() or s.get("category") == "structure"
               for s in report["signals"])


def test_pdf_clean_metadata_no_signals():
    report = analyze_ai_metadata(
        _pdf_with_meta("Microsoft Word", "Microsoft Word"),
        filename="letter.pdf",
    )
    assert report["verdict"] in ("no_signals", "possible_ai")


def test_pdf_detects_reportlab_programmatic_export():
    """AI document pipelines often emit ReportLab PDFs with no ChatGPT strings."""
    report = analyze_ai_metadata(
        _pdf_with_meta(
            "(unspecified)",
            "ReportLab PDF Library - (opensource)",
            body="CivicBot Ltd — Non-Disclosure Agreement. Governed by the laws of England & Wales.",
        ),
        filename="ai-nda.pdf",
    )
    assert report["verdict"] in ("likely_ai", "possible_ai")
    assert report["signal_count"] >= 1
    assert any("reportlab" in s.get("indicator", "").lower() or "programmatic" in s.get("indicator", "").lower()
               for s in report["signals"])


def test_pdf_detects_python_docx_pipeline():
    report = analyze_ai_metadata(
        _pdf_with_meta("Writer", "LibreOffice 7.4", body="Employment contract terms."),
        filename="auto.docx.pdf",
    )
    # author is set separately — simulate python-docx export via metadata scan on author field
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Employment contract terms.", fontsize=12)
    doc.set_metadata({
        "author": "python-docx",
        "creator": "Writer",
        "producer": "LibreOffice 7.4",
    })
    report = analyze_ai_metadata(doc.tobytes(), filename="auto.docx.pdf")
    doc.close()
    assert report["verdict"] in ("likely_ai", "possible_ai")
    assert any("python" in s.get("indicator", "").lower() for s in report["signals"])


def test_docx_detects_ai_creator():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "docProps/core.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/">'
            "<dc:creator>Claude AI Assistant</dc:creator>"
            "<cp:lastModifiedBy>Anthropic</cp:lastModifiedBy>"
            "</cp:coreProperties>",
        )
    report = analyze_ai_metadata(buf.getvalue(), filename="notes.docx")
    assert report["file_type"] == "docx"
    assert report["verdict"] in ("likely_ai", "possible_ai")


def test_build_report_pdf():
    report = analyze_ai_metadata(
        _pdf_with_meta("ChatGPT", "OpenAI"),
        filename="test.pdf",
    )
    pdf = build_report_pdf(report)
    assert pdf[:4] == b"%PDF"
    doc = fitz.open(stream=pdf, filetype="pdf")
    text = doc[0].get_text()
    doc.close()
    assert "CivicSign" in text


def _api_available() -> bool:
    try:
        r = requests.get(f"{API_BASE}/api/health", timeout=3)
        return r.status_code == 200
    except requests.RequestException:
        return False


@pytest.mark.skipif(not _api_available(), reason="API not running on :8001")
def test_api_ai_metadata_check_pdf():
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200
    pdf = _pdf_with_meta("Midjourney Bot", "Midjourney v6")
    r = s.post(
        f"{API_BASE}/api/pdf/ai-metadata-check",
        files={"file": ("test.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["verdict"] in ("likely_ai", "possible_ai")
    assert "risk_categories" in body