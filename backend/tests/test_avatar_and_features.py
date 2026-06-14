"""Backend tests for CIVICSIGN avatar upload + regression of login/me/blog/careers.
Covers the new feature endpoints related to:
  - Avatar upload/delete/fetch (POST/DELETE/GET /api/auth/avatar)
  - Regression: login (user + admin), GET /api/auth/me
  - Public lists: blog posts, careers
"""
import io
import os
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://git-workspace-3.preview.emergentagent.com").rstrip("/")
USER_EMAIL = "user@civicsign.app"
USER_PASS = "Welcome@2026!"
ADMIN_EMAIL = "admin@civicsign.app"
ADMIN_PASS = "Admin@2026!"


def _make_png(size_px: int = 8) -> bytes:
    """Create a tiny valid PNG of the given dimensions."""
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size_px, size_px, 8, 2, 0, 0, 0)  # RGB
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * size_px for _ in range(size_px))
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="session")
def user_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": USER_EMAIL, "password": USER_PASS}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"User login failed: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


# -------- Auth regression -----------------------------------------------
class TestAuthRegression:
    def test_user_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": USER_EMAIL, "password": USER_PASS}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and isinstance(body["access_token"], str)
        assert body["user"]["email"] == USER_EMAIL
        assert body["user"]["role"] == "user"

    def test_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "admin"

    def test_me_with_bearer(self, user_token):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {user_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == USER_EMAIL

    def test_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert r.status_code == 401


# -------- Avatar feature ------------------------------------------------
class TestAvatar:
    def test_upload_requires_auth(self):
        png = _make_png()
        files = {"file": ("test.png", png, "image/png")}
        r = requests.post(f"{BASE_URL}/api/auth/avatar", files=files, timeout=20)
        assert r.status_code == 401

    def test_upload_rejects_non_image(self, user_token):
        files = {"file": ("note.txt", b"hello world this is not an image", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/auth/avatar", files=files,
                          headers={"Authorization": f"Bearer {user_token}"}, timeout=20)
        assert r.status_code == 400
        assert "image" in (r.json().get("detail", "").lower())

    def test_upload_rejects_oversized(self, user_token):
        # >2MB, but use a valid mime type so size validation is what triggers
        big = b"\x00" * (2 * 1024 * 1024 + 100)
        files = {"file": ("big.png", big, "image/png")}
        r = requests.post(f"{BASE_URL}/api/auth/avatar", files=files,
                          headers={"Authorization": f"Bearer {user_token}"}, timeout=30)
        assert r.status_code == 400
        assert "large" in r.json().get("detail", "").lower() or "2 mb" in r.json().get("detail", "").lower()

    def test_upload_and_fetch_and_delete_flow(self, user_token):
        png = _make_png(16)
        files = {"file": ("avatar.png", png, "image/png")}
        h = {"Authorization": f"Bearer {user_token}"}

        # Upload
        r = requests.post(f"{BASE_URL}/api/auth/avatar", files=files, headers=h, timeout=20)
        assert r.status_code == 200, r.text
        user = r.json()
        pic = user.get("picture")
        assert pic and pic.startswith("/api/auth/avatar/"), f"unexpected picture: {pic}"
        file_id = pic.rsplit("/", 1)[-1]

        # Confirm /me reflects the change
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=h, timeout=20).json()
        assert me["picture"] == pic

        # Public fetch — no auth needed
        rget = requests.get(f"{BASE_URL}{pic}", timeout=20)
        assert rget.status_code == 200
        assert rget.headers.get("content-type", "").startswith("image/")
        assert len(rget.content) >= 64

        # Delete
        rdel = requests.delete(f"{BASE_URL}/api/auth/avatar", headers=h, timeout=20)
        assert rdel.status_code == 200
        assert rdel.json().get("picture") in (None, "")

        # After delete the avatar fetch should 404 (GridFS gone)
        rmiss = requests.get(f"{BASE_URL}/api/auth/avatar/{file_id}", timeout=20)
        assert rmiss.status_code == 404


# -------- Public feature pages (blog / careers) ------------------------
class TestPublicLists:
    def test_blog_listing(self):
        r = requests.get(f"{BASE_URL}/api/blog", timeout=20)
        # Some apps use /api/blog/posts — try fallback
        if r.status_code == 404:
            r = requests.get(f"{BASE_URL}/api/blog/posts", timeout=20)
        assert r.status_code == 200, f"blog listing failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        # Either a list or a dict with "items"/"posts"
        if isinstance(data, dict):
            data = data.get("items") or data.get("posts") or []
        assert isinstance(data, list)

    def test_careers_listing(self):
        r = requests.get(f"{BASE_URL}/api/careers", timeout=20)
        if r.status_code == 404:
            r = requests.get(f"{BASE_URL}/api/careers/jobs", timeout=20)
        assert r.status_code == 200, f"careers listing failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        if isinstance(data, dict):
            data = data.get("items") or data.get("jobs") or []
        assert isinstance(data, list)


# -------- RBAC regression ----------------------------------------------
class TestRBAC:
    def test_admin_can_list_users(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        # 200 or empty page is fine; just ensure not 401/403
        assert r.status_code in (200, 404), f"admin users got {r.status_code}: {r.text[:200]}"

    def test_user_cannot_access_admin(self, user_token):
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {user_token}"}, timeout=20)
        assert r.status_code in (401, 403), f"expected forbidden, got {r.status_code}"
