"""Deterministic provider for development and tests.

The outcome is chosen by the signer's email so a test can ask for any path
without reaching a vendor: an address containing "idv-fail" fails, one
containing "idv-expire" expires, anything else passes.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Mapping

from idv.provider import (
    STATUS_EXPIRED,
    STATUS_FAILED,
    STATUS_VERIFIED,
    IdentityProvider,
    VerificationResult,
    VerificationSession,
)

logger = logging.getLogger("civicsign.idv.mock")

SESSION_TTL_MINUTES = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


def outcome_for_email(email: str) -> str:
    addr = (email or "").lower()
    if "idv-fail" in addr:
        return STATUS_FAILED
    if "idv-expire" in addr:
        return STATUS_EXPIRED
    return STATUS_VERIFIED


class MockProvider(IdentityProvider):
    name = "mock"

    def __init__(self) -> None:
        # Sessions live in memory: this provider never runs in production.
        self._sessions: dict[str, dict] = {}

    def start_session(
        self,
        *,
        verification_id: str,
        signer_name: str,
        signer_email: str,
        required_checks: tuple[str, ...],
        return_url: str,
    ) -> VerificationSession:
        ref = f"mock_{verification_id}"
        self._sessions[ref] = {
            "status": None,  # set when the simulated flow completes
            "signer_name": signer_name,
            "signer_email": signer_email,
            "checks": tuple(required_checks),
        }
        logger.info(f"[idv-mock] session {ref} for {signer_email} ({', '.join(required_checks)})")
        return VerificationSession(
            provider=self.name,
            provider_ref=ref,
            redirect_url=return_url,
            expires_at=(_now() + timedelta(minutes=SESSION_TTL_MINUTES)).isoformat(),
        )

    def complete(self, provider_ref: str, outcome: str | None = None) -> VerificationResult:
        """Simulate the signer finishing the flow. Dev-only entry point."""
        session = self._sessions.get(provider_ref)
        if session is None:
            raise KeyError(provider_ref)
        session["status"] = outcome or outcome_for_email(session["signer_email"])
        return self.fetch_result(provider_ref)

    def fetch_result(self, provider_ref: str) -> VerificationResult:
        session = self._sessions.get(provider_ref)
        if session is None:
            return VerificationResult(
                provider=self.name,
                provider_ref=provider_ref,
                status=STATUS_EXPIRED,
                failure_reason="Verification session is no longer available",
            )
        status = session["status"]
        if status is None:
            return VerificationResult(
                provider=self.name, provider_ref=provider_ref, status="pending"
            )
        passed = status == STATUS_VERIFIED
        checks = {c: ("passed" if passed else "failed") for c in session["checks"]}
        return VerificationResult(
            provider=self.name,
            provider_ref=provider_ref,
            status=status,
            checks=checks,
            document_name=session["signer_name"] if passed else None,
            failure_reason=None if passed else f"Simulated {status} outcome",
            completed_at=_now().isoformat(),
        )

    def verify_webhook(self, payload: bytes, headers: Mapping[str, str]) -> VerificationResult:
        raise NotImplementedError("The mock provider is driven by complete(), not webhooks")
