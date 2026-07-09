"""Integration tests for PDF protect and unlock (hits live API on :8001)."""
import io
import os

import fitz
import pytest
import requests

API_BASE = os.environ.get("TEST_API_BASE", "http://127.0.0.1:8001")
PRO_EMAIL = os.environ.get("E2E_USER_EMAIL", "pro@civicbot.co.uk")
PRO_PASSWORD = os.environ.get("E2E_USER_PASSWORD", "CivicSign2026!Pro")
TEST_PASSWORD = "TestPass123"


def _api_available() -> bool:
    try:
        r = requests.get(f"{API_BASE}/api/health", timeout=3)
        return r.status_code == 200
    except requests.RequestException:
        return False


pytestmark = pytest.mark.skipif(not _api_available(), reason="API not running on :8001")


def _make_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Protect unlock integration test", fontsize=14)
    return doc.tobytes()


def _login_pro() -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def _workspace(s: requests.Session, pdf: bytes) -> dict:
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("test.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    return r.json()


def _protect(s: requests.Session, ws_id: str, password: str = TEST_PASSWORD) -> bytes:
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws_id}/protect",
        json={
            "user_password": password,
            "owner_password": None,
            "allow_print": True,
            "allow_copy": False,
            "allow_modify": False,
        },
    )
    assert r.status_code == 200, r.text
    return r.content


def test_protect_returns_encrypted_pdf():
    s = _login_pro()
    ws = _workspace(s, _make_pdf())
    protected = _protect(s, ws["workspace_id"])
    assert protected[:4] == b"%PDF"
    doc = fitz.open(stream=protected, filetype="pdf")
    assert doc.needs_pass
    doc.close()


def test_protect_rejects_short_password():
    s = _login_pro()
    ws = _workspace(s, _make_pdf())
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws['workspace_id']}/protect",
        json={"user_password": "abc", "allow_print": True, "allow_copy": False, "allow_modify": False},
    )
    assert r.status_code in (400, 422)


def test_protect_rejects_already_protected_workspace():
    s = _login_pro()
    protected = _protect(s, _workspace(s, _make_pdf())["workspace_id"])
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("locked.pdf", io.BytesIO(protected), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    locked_ws = r.json()
    assert locked_ws.get("needs_password") is True
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{locked_ws['workspace_id']}/protect",
        json={"user_password": TEST_PASSWORD, "allow_print": True, "allow_copy": False, "allow_modify": False},
    )
    assert r.status_code == 400
    assert "unlock" in r.json().get("detail", "").lower()


def test_unlock_with_correct_password():
    s = _login_pro()
    protected = _protect(s, _workspace(s, _make_pdf())["workspace_id"])
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("locked.pdf", io.BytesIO(protected), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    locked_ws = r.json()
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{locked_ws['workspace_id']}/unlock",
        json={"password": TEST_PASSWORD},
    )
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    doc = fitz.open(stream=r.content, filetype="pdf")
    assert not doc.needs_pass
    assert "Protect unlock" in doc[0].get_text()
    doc.close()


def test_unlock_rejects_wrong_password():
    s = _login_pro()
    protected = _protect(s, _workspace(s, _make_pdf())["workspace_id"])
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("locked.pdf", io.BytesIO(protected), "application/pdf")},
    )
    locked_ws = r.json()
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{locked_ws['workspace_id']}/unlock",
        json={"password": "wrong-password"},
    )
    assert r.status_code == 400
    assert "password" in r.json().get("detail", "").lower()


def test_unlock_rejects_unprotected_pdf():
    s = _login_pro()
    ws = _workspace(s, _make_pdf())
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws['workspace_id']}/unlock",
        json={"password": TEST_PASSWORD},
    )
    assert r.status_code == 400
    assert "not password protected" in r.json().get("detail", "").lower()