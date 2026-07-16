"""Block mutating API calls while staff are impersonating a customer (read-only support)."""
from __future__ import annotations

import jwt
from fastapi import HTTPException, Request
from starlette.responses import JSONResponse

from auth import JWT_ALGORITHM, _access_token_from_request, get_jwt_secret

IMPERSONATION_WRITE_ALLOWLIST: set[tuple[str, str]] = {
    ("POST", "/api/auth/logout"),
    ("POST", "/api/auth/impersonation/exit"),
    ("POST", "/api/auth/refresh"),
}

IMPERSONATION_WRITE_PREFIXES = (
    "/api/sign/",
    "/api/public/",
    "/api/webhook/",
    "/api/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/google",
)


def reject_impersonation_writes(user: dict, *, detail: str | None = None) -> None:
    if user.get("_impersonating"):
        raise HTTPException(
            status_code=403,
            detail=detail or "This action is not allowed during a support viewing session.",
        )


def _token_has_impersonation_claim(token: str) -> bool:
    if not token or len(token) > 2048:
        return False
    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": True},
        )
    except jwt.InvalidTokenError:
        return False
    return bool(payload.get("imp")) and payload.get("type") == "access"


async def impersonation_readonly_middleware(request: Request, call_next):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)

    path = request.url.path.rstrip("/") or "/"
    if (request.method, path) in IMPERSONATION_WRITE_ALLOWLIST:
        return await call_next(request)
    if any(path.startswith(prefix) for prefix in IMPERSONATION_WRITE_PREFIXES):
        return await call_next(request)

    token = _access_token_from_request(request)
    if token and _token_has_impersonation_claim(token):
        return JSONResponse(
            status_code=403,
            content={
                "detail": (
                    "This action is not allowed during a support viewing session. "
                    "Exit impersonation to continue."
                ),
            },
        )

    return await call_next(request)