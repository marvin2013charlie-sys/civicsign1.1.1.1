"""Shared security helpers — CORS, redirect validation, dev-mode gating."""
import ipaddress
import os
import re
import socket
from html import escape
from typing import Optional
from urllib.parse import urlparse

from fastapi import HTTPException

_URL_PREFIX = re.compile(r"^https?://", re.I)


def is_dev_mode() -> bool:
    """Secrets/OTPs are only returned when DEV_MODE is explicitly enabled."""
    return os.environ.get("DEV_MODE", "").lower() in ("1", "true", "yes")


def get_cors_origins() -> list:
    """Explicit allow-list; never returns wildcard when credentials are used."""
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw or raw == "*":
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    origins = [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]
    return origins or ["http://localhost:3000"]


_PRIVATE_NETS = tuple(
    ipaddress.ip_network(cidr)
    for cidr in (
        "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
        "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
        "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/4", "240.0.0.0/4",
        "::1/128", "fc00::/7", "fe80::/10",
    )
)


def _ip_is_blocked(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return True
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
        return True
    return any(ip in net for net in _PRIVATE_NETS)


def validate_webhook_url(url: str) -> str:
    """Reject SSRF targets (metadata, RFC1918, loopback) for outbound webhooks."""
    candidate = (url or "").strip()
    if not candidate:
        return ""
    parsed = urlparse(candidate)
    if parsed.scheme == "https":
        pass
    elif parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"):
        pass
    else:
        raise HTTPException(
            status_code=400,
            detail="Webhook URL must use HTTPS (http://localhost allowed in dev only)",
        )
    host = parsed.hostname
    if not host:
        raise HTTPException(status_code=400, detail="Invalid webhook URL")
    if host in ("localhost", "127.0.0.1"):
        return candidate
    try:
        infos = socket.getaddrinfo(host, parsed.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Webhook hostname could not be resolved")
    for info in infos:
        if _ip_is_blocked(info[4][0]):
            raise HTTPException(
                status_code=400,
                detail="Webhook URL must not target private, loopback, or metadata addresses",
            )
    return candidate


def validate_redirect_base(url: str, *, fallback: str = "") -> str:
    """Validate and return a normalised origin for redirects and sign links."""
    candidate = (url or fallback or "").strip().rstrip("/")
    if not candidate:
        raise HTTPException(status_code=400, detail="Missing origin URL")
    if not _URL_PREFIX.match(candidate):
        raise HTTPException(status_code=400, detail="Origin must use http or https")
    parsed = urlparse(candidate)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid origin URL")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in get_cors_origins():
        raise HTTPException(status_code=400, detail="Origin not allowed")
    return origin


def esc(text) -> str:
    """HTML-escape user-controlled strings for email templates."""
    return escape(str(text or ""), quote=True)


def safe_href(url: str) -> str:
    """Return an escaped href or '#' if the URL is unsafe."""
    if not url or not _URL_PREFIX.match(url):
        return "#"
    return escape(url, quote=True)


def cookie_secure() -> bool:
    """Use Secure cookies in production; set COOKIE_SECURE=false for local HTTP dev."""
    return os.environ.get("COOKIE_SECURE", "true").lower() in ("1", "true", "yes")


def trust_proxy() -> bool:
    return os.environ.get("TRUST_PROXY", "").lower() in ("1", "true", "yes")


def assert_safe_production() -> None:
    """Refuse to start with DEV_MODE enabled outside local development."""
    if not is_dev_mode():
        return
    mongo = (os.environ.get("MONGO_URL") or "").lower()
    cors = (os.environ.get("CORS_ORIGINS") or "").lower()
    local_mongo = "localhost" in mongo or "127.0.0.1" in mongo
    local_cors = not cors or "localhost" in cors or "127.0.0.1" in cors
    if not (local_mongo and local_cors):
        raise RuntimeError(
            "DEV_MODE is enabled but deployment does not look local. "
            "Unset DEV_MODE in production."
        )


def security_headers() -> dict[str, str]:
    """Baseline HTTP security headers for API responses."""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy": (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        ),
    }


# Magic-byte signatures for uploaded images
_IMAGE_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),  # RIFF....WEBP checked below
}


def sniff_image_type(data: bytes) -> Optional[str]:
    """Return MIME type from magic bytes, or None if unrecognized."""
    if len(data) < 12:
        return None
    for mime, prefixes in _IMAGE_SIGNATURES.items():
        for prefix in prefixes:
            if data.startswith(prefix):
                if mime == "image/webp" and data[8:12] != b"WEBP":
                    continue
                return mime
    return None