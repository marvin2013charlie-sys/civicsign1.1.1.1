"""Security hardening regression tests."""
import asyncio
import os

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("DEV_MODE", "true")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-minimum-32-characters-long")
os.environ.setdefault("PLAN_ENCRYPTION_SECRET", "test-plan-encryption-secret-key")
os.environ["REGISTRATION_ENABLED"] = "false"

from server import app  # noqa: E402


def run(coro):
    return asyncio.run(coro)


async def _client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def test_registration_blocked_when_disabled():
    async def _test():
        async with await _client() as client:
            res = await client.post(
                "/api/auth/register",
                json={
                    "name": "Blocked User",
                    "email": "blocked@example.com",
                    "password": "SecurePass1!",
                },
            )
            assert res.status_code == 403
            assert "closed" in res.json().get("detail", "").lower()

    run(_test())


def test_impersonation_blocks_account_delete():
    async def _test():
        from datetime import datetime, timedelta, timezone
        from auth import JWT_ALGORITHM, get_jwt_secret

        token = jwt.encode(
            {
                "sub": "user_test123",
                "email": "victim@example.com",
                "type": "access",
                "tv": 0,
                "imp": True,
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                "iat": datetime.now(timezone.utc),
            },
            get_jwt_secret(),
            algorithm=JWT_ALGORITHM,
        )
        async with await _client() as client:
            res = await client.request(
                "DELETE",
                "/api/auth/account",
                json={"confirm": "DELETE"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 403

    run(_test())