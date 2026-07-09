"""Integration tests for PDF compress and watermark (hits live API on :8001)."""
import io
import os
import uuid

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


def _make_image_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Compress watermark integration test", fontsize=14)
    inner = fitz.open()
    pg = inner.new_page(width=200, height=150)
    pg.draw_rect(pg.rect, color=None, fill=(0.2, 0.5, 0.9))
    png = pg.get_pixmap(dpi=150).tobytes("png")
    inner.close()
    page.insert_image(fitz.Rect(72, 120, 400, 350), stream=png)
    doc.new_page().insert_text((72, 72), "Page 2")
    return doc.tobytes()


def _logo_png() -> bytes:
    img = fitz.open()
    pg = img.new_page(width=80, height=40)
    pg.insert_text((8, 28), "LOGO", fontsize=14)
    data = pg.get_pixmap().tobytes("png")
    img.close()
    return data


def _login_pro() -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API_BASE}/api/auth/login", json={"email": PRO_EMAIL, "password": PRO_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def _workspace(s: requests.Session, pdf: bytes) -> str:
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("test.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    return r.json()["workspace_id"]


def test_compress_returns_valid_pdf_with_headers():
    s = _login_pro()
    ws = _workspace(s, _make_image_pdf())
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/compress", json={"preset": "medium"})
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    assert r.headers.get("X-Original-Bytes")
    assert r.headers.get("X-Compressed-Bytes")
    assert int(r.headers["X-Compressed-Bytes"]) <= int(r.headers["X-Original-Bytes"])
    doc = fitz.open(stream=r.content, filetype="pdf")
    assert len(doc) >= 1
    doc.close()


def test_compress_rejects_invalid_preset():
    s = _login_pro()
    ws = _workspace(s, _make_image_pdf())
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/compress", json={"preset": "ultra"})
    assert r.status_code == 400


def test_watermark_text_rotation_and_range():
    s = _login_pro()
    ws = _workspace(s, _make_image_pdf())
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws}/watermark",
        data={"kind": "text", "text": "CONFIDENTIAL", "rotation": "45", "opacity": "0.4", "page_range": "all"},
    )
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    doc = fitz.open(stream=r.content, filetype="pdf")
    text = "".join(doc[i].get_text() for i in range(len(doc)))
    assert "CONFIDENTIAL" in text
    doc.close()

    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws}/watermark",
        data={"kind": "text", "text": "PAGE1ONLY", "page_range": "1", "rotation": "0"},
    )
    assert r.status_code == 200
    doc = fitz.open(stream=r.content, filetype="pdf")
    assert "PAGE1ONLY" in doc[0].get_text()
    doc.close()


def test_watermark_image():
    s = _login_pro()
    ws = _workspace(s, _make_image_pdf())
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws}/watermark",
        data={"kind": "image", "opacity": "0.4", "rotation": "30", "image_scale": "0.25"},
        files={"image": ("logo.png", _logo_png(), "image/png")},
    )
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    doc = fitz.open(stream=r.content, filetype="pdf")
    assert len(doc[0].get_images()) >= 1
    doc.close()


def test_watermark_image_visible_on_opaque_certificate():
    """Image watermarks must render on top with transparency (opaque certs hide background layers)."""
    cert_path = "/Users/kiara2903/Downloads/certificate covidDHARA.pdf"
    try:
        with open(cert_path, "rb") as fh:
            base = fh.read()
    except FileNotFoundError:
        pytest.skip("certificate fixture not available on this machine")

    s = _login_pro()
    ws = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("certificate.pdf", io.BytesIO(base), "application/pdf")},
    )
    assert ws.status_code == 200, ws.text
    wid = ws.json()["workspace_id"]
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{wid}/watermark",
        data={"kind": "image", "opacity": "0.45", "rotation": "45", "image_scale": "0.4"},
        files={"image": ("logo.png", _logo_png(), "image/png")},
    )
    assert r.status_code == 200, r.text
    rendered = fitz.open(stream=r.content, filetype="pdf")
    page = rendered[0]
    contents = page.read_contents().decode("latin-1", "ignore").lower()
    img_pos = contents.find("fzimg")
    text_pos = contents.find("bt")
    assert img_pos > text_pos, "Watermark image should paint over page content"
    pix = page.get_pixmap(dpi=120)
    cx, cy = pix.width // 2, pix.height // 2
    r_px, g_px, b_px = pix.pixel(cx, cy)[:3]
    rendered.close()
    assert not (r_px > 250 and g_px > 250 and b_px > 250), f"Watermark not visible at centre, got {(r_px, g_px, b_px)}"


def test_watermark_unicode_filename():
    s = _login_pro()
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Unicode filename watermark test")
    pdf = doc.tobytes()
    doc.close()
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("CivicBot – Final Technical PRD.pdf", io.BytesIO(pdf), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    ws = r.json()["workspace_id"]
    r = s.post(
        f"{API_BASE}/api/pdf/workspace/{ws}/watermark",
        data={"kind": "text", "text": "CONFIDENTIAL do not save", "rotation": "45", "opacity": "0.35", "page_range": "all"},
    )
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    assert "filename*=" in r.headers.get("Content-Disposition", "")


def test_watermark_image_requires_file():
    s = _login_pro()
    ws = _workspace(s, _make_image_pdf())
    r = s.post(f"{API_BASE}/api/pdf/workspace/{ws}/watermark", data={"kind": "image"})
    assert r.status_code == 400


def test_pdf_tools_require_pro_plan():
    s = requests.Session()
    email = f"free_{uuid.uuid4().hex[:8]}@civicbot.co.uk"
    reg = s.post(
        f"{API_BASE}/api/auth/register",
        json={"name": "Free User", "email": email, "password": "Test1234!Free"},
    )
    assert reg.status_code == 200, reg.text
    code = reg.json().get("dev_code")
    assert code
    v = s.post(f"{API_BASE}/api/auth/verify-email", json={"email": email, "code": code})
    assert v.status_code == 200, v.text
    r = s.post(
        f"{API_BASE}/api/pdf/workspace",
        files={"file": ("t.pdf", io.BytesIO(_make_image_pdf()), "application/pdf")},
    )
    assert r.status_code == 402, r.text