"""CivicSign's own document verification — no vendor in the path.

Today this stack reads the printed MRZ and checks it against ICAO 9303: every
check digit, the expiry date, and the name used for recipient matching.

It deliberately refuses to start when liveness, face match or chip reading are
required. Those need a licensed anti-spoof SDK and a native client, and
accepting the job while silently skipping the check would put an overstated
result on a legal certificate.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Mapping

from idv import mrz
from idv.provider import (
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_VERIFIED,
    IdentityProvider,
    ProviderError,
    VerificationResult,
    VerificationSession,
)

logger = logging.getLogger("civicsign.idv.own")

SUPPORTED_CHECKS = frozenset({"document"})
SESSION_TTL_MINUTES = 30


def unsupported(required_checks) -> list[str]:
    return [c for c in required_checks if c not in SUPPORTED_CHECKS]


def evaluate_mrz(raw: str, provider_ref: str) -> tuple[VerificationResult, dict]:
    """Judge a submitted MRZ. Pure: no I/O, no stored state, no images."""
    def failed(reason: str) -> tuple[VerificationResult, dict]:
        return (
            VerificationResult(
                provider="civicsign",
                provider_ref=provider_ref,
                status=STATUS_FAILED,
                checks={"document": "failed"},
                failure_reason=reason,
                completed_at=datetime.now(timezone.utc).isoformat(),
            ),
            {},
        )

    try:
        data = mrz.parse(raw)
    except mrz.MrzError as exc:
        return failed(f"Could not read the machine readable zone: {exc}")

    problems = list(data.errors)
    if data.is_expired():
        problems.append("The document has expired")
    if problems:
        return failed("; ".join(problems))

    return (
        VerificationResult(
            provider="civicsign",
            provider_ref=provider_ref,
            status=STATUS_VERIFIED,
            checks={"document": "passed"},
            document_name=data.full_name,
            completed_at=datetime.now(timezone.utc).isoformat(),
        ),
        data.summary(),
    )


class CivicSignProvider(IdentityProvider):
    name = "civicsign"

    def start_session(
        self,
        *,
        verification_id: str,
        signer_name: str,
        signer_email: str,
        required_checks: tuple[str, ...],
        return_url: str,
    ) -> VerificationSession:
        missing = unsupported(required_checks)
        if missing:
            raise ProviderError(
                "CivicSign's own verification covers the document only. "
                f"{', '.join(missing)} needs a licensed provider."
            )
        logger.info(f"[idv-own] session for {verification_id} ({', '.join(required_checks)})")
        return VerificationSession(
            provider=self.name,
            provider_ref=f"cs_{verification_id}",
            redirect_url=return_url,  # the signer never leaves CivicSign
            expires_at=(
                datetime.now(timezone.utc) + timedelta(minutes=SESSION_TTL_MINUTES)
            ).isoformat(),
        )

    def fetch_result(self, provider_ref: str) -> VerificationResult:
        """Pending until the signer submits a document to our own endpoint."""
        return VerificationResult(
            provider=self.name, provider_ref=provider_ref, status=STATUS_PENDING
        )

    def verify_webhook(self, payload: bytes, headers: Mapping[str, str]) -> VerificationResult:
        raise NotImplementedError("CivicSign's own provider has no external callbacks")
