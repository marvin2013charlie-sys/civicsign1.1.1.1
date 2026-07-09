"""Tests for redirect origin validation and localhost alias expansion."""
import os

import pytest
from fastapi import HTTPException

from security_utils import allowed_redirect_origins, validate_redirect_base


@pytest.fixture(autouse=True)
def _clear_origin_env(monkeypatch):
    for key in ("CORS_ORIGINS", "FRONTEND_URL", "PUBLIC_SITE_URL"):
        monkeypatch.delenv(key, raising=False)


def test_localhost_alias_accepts_127(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    assert "http://127.0.0.1:3000" in allowed_redirect_origins()
    assert validate_redirect_base("http://127.0.0.1:3000") == "http://127.0.0.1:3000"


def test_127_alias_accepts_localhost(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://127.0.0.1:3000")
    assert "http://localhost:3000" in allowed_redirect_origins()
    assert validate_redirect_base("http://localhost:3000") == "http://localhost:3000"


def test_fallback_origin_header(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    assert validate_redirect_base("", fallback="http://127.0.0.1:3000") == "http://127.0.0.1:3000"


def test_frontend_url_fallback(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000/")
    assert validate_redirect_base("http://127.0.0.1:3000") == "http://127.0.0.1:3000"


def test_rejects_unknown_origin(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    with pytest.raises(HTTPException) as exc:
        validate_redirect_base("https://evil.example.com")
    assert exc.value.status_code == 400
    assert "Origin not allowed" in exc.value.detail