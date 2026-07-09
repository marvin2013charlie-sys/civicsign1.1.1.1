"""Integration tests for saving Manage PDF results to Documents."""
import io
import os

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


pytestmark = pytest.mark.skipif(not _api_available(), reason="API not running on :8001")


def _make_pdf() -> bytes:
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Save to documents test")
    return doc.tobytes()


def _login_pro() -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def test_save_pdf_bytes_to_documents():
    s = _login_pro()
    r = s.post(
        f"{API_BASE}/api/pdf/save-to-documents",
        files={"file": ("watermarked.pdf", io.BytesIO(_make_pdf()), "application/pdf")},
        data={"title": "My Watermarked Doc", "tool": "watermark", "original_filename": "source.pdf"},
    )
    assert r.status_code == 200, r.text
    env = r.json()
    assert env["source"] == "manage_pdf"
    assert env["manage_pdf_tool"] == "watermark"
    assert env["status"] == "draft"
    assert env["title"] == "My Watermarked Doc"


def test_workspace_save_to_documents_tags_manage_pdf():
    s = _login_pro()
    ws = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("edit.pdf", io.BytesIO(_make_pdf()), "application/pdf")},
    )
    assert ws.status_code == 200, ws.text
    wid = ws.json()["workspace_id"]
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{wid}/save-to-documents",
        data={"title": "Edited contract", "tool": "edit"},
    )
    assert r.status_code == 200, r.text
    env = r.json()
    assert env["source"] == "manage_pdf"
    assert env["manage_pdf_tool"] == "edit"