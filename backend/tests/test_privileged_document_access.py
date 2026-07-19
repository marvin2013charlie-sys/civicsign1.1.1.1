"""Staff and impersonation sessions must not read customer PDFs or envelope secrets."""
import io
import os

import fitz
import pytest
import requests

from auth import create_access_token

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
    page = doc.new_page()
    page.insert_text((72, 72), "Privileged access test", fontsize=14)
    return doc.tobytes()


def _login_pro() -> tuple[requests.Session, dict]:
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200, r.text
    me = s.get(f"{API_BASE}/api/auth/me").json()
    return s, me


def _impersonation_headers(user: dict) -> dict[str, str]:
    token = create_access_token(
        user["user_id"],
        user["email"],
        token_version=int(user.get("token_version") or 0),
        impersonating=True,
    )
    return {"Authorization": f"Bearer {token}"}


def _admin_session() -> requests.Session:
    """Login sets HttpOnly cookies; do not expect access_token in JSON body."""
    s = requests.Session()
    r = s.post(
        f"{API_BASE}/api/auth/login",
        json={"email": "admin@civicbot.co.uk", "password": "CivicSign2026!Admin"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert s.cookies.get("access_token"), "expected access_token cookie"
    return s


def test_impersonation_blocks_envelope_pdf_download():
    s, me = _login_pro()
    headers = _impersonation_headers(me)

    envs = s.get(f"{API_BASE}/api/envelopes", headers=headers).json()
    if not envs:
        r = s.post(
            f"{API_BASE}/api/envelopes",
            files={"file": ("secret.pdf", io.BytesIO(_make_pdf()), "application/pdf")},
            data={"title": "Secret customer contract"},
        )
        assert r.status_code == 200, r.text
        env_id = r.json()["envelope_id"]
    else:
        env_id = envs[0]["envelope_id"]

    blocked = requests.get(f"{API_BASE}/api/envelopes/{env_id}/file", headers=headers)
    assert blocked.status_code == 403
    assert "support access" in blocked.json().get("detail", "").lower()


def test_impersonation_redacts_envelope_metadata():
    s, me = _login_pro()
    headers = _impersonation_headers(me)

    created = s.post(
        f"{API_BASE}/api/envelopes",
        files={"file": ("secret.pdf", io.BytesIO(_make_pdf()), "application/pdf")},
        data={"title": "Secret customer contract"},
    )
    assert created.status_code == 200, created.text
    env_id = created.json()["envelope_id"]

    detail = requests.get(f"{API_BASE}/api/envelopes/{env_id}", headers=headers).json()
    assert detail["title"] == "Confidential document"
    assert detail.get("document", {}).get("file_id") is None
    assert detail.get("message") == ""


def test_impersonation_blocks_bulk_seal_verify():
    _, me = _login_pro()
    headers = _impersonation_headers(me)
    r = requests.post(
        f"{API_BASE}/api/envelopes/verify-seals/bulk",
        headers=headers,
        json={"limit": 5, "skip": 0},
    )
    assert r.status_code == 403


def test_impersonation_blocks_pdf_workspace_download():
    s, me = _login_pro()
    headers = _impersonation_headers(me)
    ws = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("workspace.pdf", io.BytesIO(_make_pdf()), "application/pdf")},
    )
    assert ws.status_code == 200, ws.text
    ws_id = ws.json()["workspace_id"]

    blocked = requests.get(f"{API_BASE}/api/pdf/workspace/{ws_id}/download", headers=headers)
    assert blocked.status_code == 403


def test_admin_panel_cannot_browse_envelopes():
    s = _admin_session()
    r = s.get(f"{API_BASE}/api/admin/envelopes")
    assert r.status_code == 404


def test_admin_panel_cannot_export_envelopes():
    s = _admin_session()
    r = s.get(f"{API_BASE}/api/admin/export/envelopes.csv")
    assert r.status_code == 404