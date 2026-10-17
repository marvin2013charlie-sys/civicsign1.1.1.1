"""Stripe Identity provider.

Chosen for phase 1 because the keys, webhook handling and processor agreement
already exist for billing. Stripe performs the document and selfie checks and
keeps the images; CivicSign stores only the outcome.

Required configuration:
  IDV_PROVIDER=stripe
  STRIPE_API_KEY=sk_...                  (shared with billing)
  STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_  (falls back to STRIPE_WEBHOOK_SECRET)
"""
from __future__ import annotations

import logging
import os
from typing import Mapping

import stripe

from idv.provider import (
    STATUS_EXPIRED,
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_VERIFIED,
    IdentityProvider,
    ProviderError,
    VerificationResult,
    VerificationSession,
)

logger = logging.getLogger("civicsign.idv.stripe")

# Stripe runs document and selfie checks; chip reading needs a native client.
_SUPPORTED_CHECKS = {"document", "liveness", "face_match"}

_EVENT_PREFIX = "identity.verification_session."


def _api_key() -> str:
    key = os.environ.get("STRIPE_API_KEY")
    if not key:
        raise ProviderError("STRIPE_API_KEY is not set")
    return key


def webhook_secret() -> str:
    secret = (
        os.environ.get("STRIPE_IDENTITY_WEBHOOK_SECRET")
        or os.environ.get("STRIPE_WEBHOOK_SECRET")
    )
    if not secret:
        raise ProviderError("STRIPE_IDENTITY_WEBHOOK_SECRET is not set")
    return secret


def configured() -> bool:
    return bool(os.environ.get("STRIPE_API_KEY"))


def _document_name(outputs) -> str | None:
    """Stripe returns the name as separate fields; the service matches on tokens."""
    if not outputs:
        return None
    get = outputs.get if isinstance(outputs, dict) else lambda k: getattr(outputs, k, None)
    parts = [get("first_name"), get("last_name")]
    name = " ".join(p for p in parts if p)
    return name or None


def map_session(session, required_checks: tuple[str, ...] = ()) -> VerificationResult:
    """Translate a Stripe session into our own result. Pure, so it is testable."""
    get = session.get if isinstance(session, dict) else lambda k, d=None: getattr(session, k, d)
    status = get("status")
    last_error = get("last_error") or {}
    error_code = (
        last_error.get("code") if isinstance(last_error, dict) else getattr(last_error, "code", None)
    )
    error_reason = (
        last_error.get("reason") if isinstance(last_error, dict)
        else getattr(last_error, "reason", None)
    )

    checks = {c: "skipped" for c in required_checks if c not in _SUPPORTED_CHECKS}

    if status == "verified":
        for c in required_checks:
            if c in _SUPPORTED_CHECKS:
                checks[c] = "passed"
        return VerificationResult(
            provider="stripe",
            provider_ref=get("id"),
            status=STATUS_VERIFIED,
            checks=checks,
            document_name=_document_name(get("verified_outputs")),
            completed_at=None,
        )

    if status == "canceled":
        return VerificationResult(
            provider="stripe", provider_ref=get("id"), status=STATUS_EXPIRED,
            checks=checks, failure_reason="Verification was cancelled before it completed",
        )

    # requires_input with an error is a real failure; without one the signer
    # simply has not finished yet.
    if status == "requires_input" and error_code:
        for c in required_checks:
            if c in _SUPPORTED_CHECKS:
                checks[c] = "failed"
        return VerificationResult(
            provider="stripe", provider_ref=get("id"), status=STATUS_FAILED, checks=checks,
            failure_reason=error_reason or f"Verification failed ({error_code})",
        )

    return VerificationResult(
        provider="stripe", provider_ref=get("id"), status=STATUS_PENDING, checks=checks
    )


class StripeIdentityProvider(IdentityProvider):
    name = "stripe"

    def start_session(
        self,
        *,
        verification_id: str,
        signer_name: str,
        signer_email: str,
        required_checks: tuple[str, ...],
        return_url: str,
    ) -> VerificationSession:
        stripe.api_key = _api_key()
        unsupported = [c for c in required_checks if c not in _SUPPORTED_CHECKS]
        if unsupported:
            logger.info(
                f"[idv-stripe] {verification_id}: {', '.join(unsupported)} not supported "
                "by this provider — recorded as skipped"
            )
        try:
            session = stripe.identity.VerificationSession.create(
                type="document",
                return_url=return_url,
                metadata={
                    "verification_id": verification_id,
                    "signer_email": signer_email,
                    "product": "civicsign",
                    "required_checks": ",".join(required_checks),
                },
                options={
                    "document": {
                        "require_live_capture": True,
                        "require_matching_selfie": "face_match" in required_checks
                        or "liveness" in required_checks,
                    }
                },
            )
        except Exception as exc:  # stripe raises a family of errors
            raise ProviderError(f"Could not start verification: {exc}") from exc

        return VerificationSession(
            provider=self.name,
            provider_ref=session.id,
            redirect_url=session.url,
            expires_at="",  # Stripe hosted sessions do not expose a fixed expiry
        )

    def fetch_result(self, provider_ref: str) -> VerificationResult:
        stripe.api_key = _api_key()
        try:
            session = stripe.identity.VerificationSession.retrieve(
                provider_ref, expand=["verified_outputs"]
            )
        except Exception as exc:
            raise ProviderError(f"Could not read verification {provider_ref}: {exc}") from exc
        checks = tuple(
            (session.get("metadata") or {}).get("required_checks", "").split(",")
        ) if session.get("metadata") else ()
        return map_session(session, tuple(c for c in checks if c))

    def verify_webhook(self, payload: bytes, headers: Mapping[str, str]) -> VerificationResult:
        """Authenticate the delivery. Details are re-read with fetch_result."""
        sig = headers.get("stripe-signature") or headers.get("Stripe-Signature")
        if not sig:
            raise ProviderError("Missing Stripe-Signature header")
        try:
            event = stripe.Webhook.construct_event(payload, sig, webhook_secret())
        except Exception as exc:
            raise ProviderError(f"Invalid webhook signature: {exc}") from exc

        event_type = event.get("type") or ""
        if not event_type.startswith(_EVENT_PREFIX):
            raise ProviderError(f"Ignoring unrelated event {event_type}")
        session = (event.get("data") or {}).get("object") or {}
        return map_session(session)

    def redact(self, provider_ref: str) -> None:
        """Ask Stripe to delete the collected images once the outcome is recorded."""
        stripe.api_key = _api_key()
        try:
            stripe.identity.VerificationSession.redact(provider_ref)
        except Exception as exc:
            logger.warning(f"[idv-stripe] redaction failed for {provider_ref}: {exc}")
