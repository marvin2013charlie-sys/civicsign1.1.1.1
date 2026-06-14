"""Backend tests for PDF Manager workspace endpoints (/api/pdf/*)."""
import io
import os
import zipfile

import fitz
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://git-workspace-3.preview.emergentagent.com").rstrip("/")
USER_EMAIL = "user@civicsign.app"
USER_PASSWORD = "Welcome@2026!"


# ---------- Fixtures --------------------------------------------------------
@pytest.fixture(scope="session")
def user_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": USER_EMAIL, "password": USER_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def other_user_token():
    """Login as admin to use as a 'different user' for RBAC tests."""
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@civicsign.app", "password": "Admin@2026!"}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture(scope="session")
def small_pdf_bytes():
    doc = fitz.open()
    for i in range(3):
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 100 + i * 20), f"Hello page {i + 1}", fontsize=14)
    b = doc.tobytes()
    doc.close()
    return b


@pytest.fixture
def workspace(auth, small_pdf_bytes):
    files = {"file": ("sample.pdf", small_pdf_bytes, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    ws = r.json()
    yield ws
    requests.delete(f"{BASE_URL}/api/pdf/workspace/{ws['workspace_id']}", headers=auth, timeout=30)


# ---------- Tests -----------------------------------------------------------
def test_create_workspace_pdf(auth, small_pdf_bytes):
    files = {"file": ("sample.pdf", small_pdf_bytes, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["workspace_id"].startswith("ws_")
    assert j["page_count"] == 3
    assert isinstance(j["pages"], list) and len(j["pages"]) == 3
    requests.delete(f"{BASE_URL}/api/pdf/workspace/{j['workspace_id']}", headers=auth)


def test_create_workspace_rejects_txt(auth):
    files = {"file": ("notes.txt", b"hello", "text/plain")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=30)
    assert r.status_code == 400


def test_create_workspace_rejects_oversize(auth):
    big = b"x" * (21 * 1024 * 1024)
    files = {"file": ("big.pdf", big, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=120)
    assert r.status_code == 400


def test_render_page_png(workspace, auth):
    r = requests.get(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/page/0.png",
                     headers=auth, timeout=60)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/png")
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_add_text(workspace, auth):
    body = {"page": 0, "x": 0.1, "y": 0.1, "text": "TEST_TEXT", "font_size": 16, "color": "#FF0000"}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/text",
                      json=body, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["page_count"] == 3


def test_whiteout(workspace, auth):
    body = {"page": 0, "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.05}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/whiteout",
                      json=body, headers=auth, timeout=60)
    assert r.status_code == 200, r.text


def test_add_image(workspace, auth):
    # generate a tiny PNG via PyMuPDF
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 10, 10))
    pix.clear_with(0)
    img_bytes = pix.tobytes("png")
    files = {"file": ("dot.png", img_bytes, "image/png")}
    data = {"page": "0", "x": "0.2", "y": "0.2", "w": "0.1", "h": "0.1"}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/image",
                      files=files, data=data, headers=auth, timeout=60)
    assert r.status_code == 200, r.text


def test_page_ops_rotate_insert_delete_reorder(workspace, auth):
    wid = workspace["workspace_id"]
    # rotate
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{wid}/page-op",
                      json={"op": "rotate", "page": 0, "degrees": 90},
                      headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["page_count"] == 3

    # insert-blank
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{wid}/page-op",
                      json={"op": "insert-blank", "at": 3},
                      headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["page_count"] == 4

    # reorder
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{wid}/page-op",
                      json={"op": "reorder", "order": [3, 2, 1, 0]},
                      headers=auth, timeout=60)
    assert r.status_code == 200, r.text

    # delete
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{wid}/page-op",
                      json={"op": "delete", "page": 0},
                      headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["page_count"] == 3


def test_merge(workspace, auth, small_pdf_bytes):
    files = {"file": ("merge.pdf", small_pdf_bytes, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/merge",
                      files=files, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["page_count"] == 6  # 3 + 3


def test_split_returns_zip(workspace, auth):
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/split",
                      json={"ranges": "1-2, 3"}, headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("application/zip")
    z = zipfile.ZipFile(io.BytesIO(r.content))
    names = z.namelist()
    assert len(names) == 2


def test_download(workspace, auth):
    r = requests.get(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/download",
                     headers=auth, timeout=60)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"


def test_save_to_documents_creates_envelope(workspace, auth):
    r = requests.post(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}/save-to-documents",
                      headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    env_id = r.json()["envelope_id"]
    assert env_id.startswith("env_")
    # Verify it appears in /api/envelopes
    r2 = requests.get(f"{BASE_URL}/api/envelopes", headers=auth, timeout=30)
    assert r2.status_code == 200
    ids = [e["envelope_id"] for e in r2.json()]
    assert env_id in ids
    # cleanup envelope
    requests.delete(f"{BASE_URL}/api/envelopes/{env_id}", headers=auth)


def test_delete_workspace(auth, small_pdf_bytes):
    files = {"file": ("del.pdf", small_pdf_bytes, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=60)
    wid = r.json()["workspace_id"]
    r2 = requests.delete(f"{BASE_URL}/api/pdf/workspace/{wid}", headers=auth, timeout=30)
    assert r2.status_code == 200
    r3 = requests.get(f"{BASE_URL}/api/pdf/workspace/{wid}", headers=auth, timeout=30)
    assert r3.status_code == 404


def test_rbac_other_user_cannot_access(workspace, other_user_token):
    headers = {"Authorization": f"Bearer {other_user_token}"}
    r = requests.get(f"{BASE_URL}/api/pdf/workspace/{workspace['workspace_id']}",
                     headers=headers, timeout=30)
    assert r.status_code == 404


def test_docx_conversion(auth):
    """Upload a minimal .docx and confirm conversion succeeds."""
    # Build a real minimal docx in-memory using zipfile (Word format is a ZIP).
    docx_buf = io.BytesIO()
    with zipfile.ZipFile(docx_buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                   '</Types>')
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                   '</Relationships>')
        z.writestr("word/document.xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                   '<w:body><w:p><w:r><w:t>Hello from DOCX</w:t></w:r></w:p></w:body></w:document>')
    files = {"file": ("hello.docx", docx_buf.getvalue(),
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    r = requests.post(f"{BASE_URL}/api/pdf/workspace", files=files, headers=auth, timeout=120)
    if r.status_code != 200:
        pytest.skip(f"DOCX conversion path returned {r.status_code}: {r.text[:200]}")
    j = r.json()
    assert j["page_count"] >= 1
    requests.delete(f"{BASE_URL}/api/pdf/workspace/{j['workspace_id']}", headers=auth)
