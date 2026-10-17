"""The contract every identity provider implements.

Methods are synchronous because vendor SDKs are; the service layer runs them
off the event loop. Nothing here knows about envelopes, recipients or Mongo.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Mapping

# Checks a sender can demand of a signer.
ALL_CHECKS = ("document", "liveness", "face_match", "chip")
# Chip reading needs a native client, so it is opt-in rather than default.
DEFAULT_CHECKS = ("document", "liveness", "face_match")

STATUS_PENDING = "pending"
STATUS_VERIFIED = "verified"
STATUS_FAILED = "failed"
STATUS_EXPIRED = "expired"
TERMINAL_STATUSES = frozenset({STATUS_VERIFIED, STATUS_FAILED, STATUS_EXPIRED})


@dataclass(frozen=True)
class VerificationSession:
    """A verification the signer has been sent to complete."""

    provider: str
    provider_ref: str
    redirect_url: str
    expires_at: str


@dataclass(frozen=True)
class VerificationResult:
    """The provider's answer. `checks` maps a check name to passed/failed/skipped."""

    provider: str
    provider_ref: str
    status: str
    checks: Mapping[str, str] = field(default_factory=dict)
    document_name: str | None = None
    failure_reason: str | None = None
    completed_at: str | None = None

    @property
    def is_terminal(self) -> bool:
        return self.status in TERMINAL_STATUSES


class ProviderError(RuntimeError):
    """Raised when a provider cannot be reached or returns something unusable."""


class IdentityProvider(abc.ABC):
    """Implement this once per vendor. Keep vendor types inside the subclass."""

    name: str = "unknown"

    @abc.abstractmethod
    def start_session(
        self,
        *,
        verification_id: str,
        signer_name: str,
        signer_email: str,
        required_checks: tuple[str, ...],
        return_url: str,
    ) -> VerificationSession:
        """Create a verification the signer can complete, and return where to send them."""

    @abc.abstractmethod
    def fetch_result(self, provider_ref: str) -> VerificationResult:
        """Read the current result. Called while polling and to settle disputes."""

    @abc.abstractmethod
    def verify_webhook(self, payload: bytes, headers: Mapping[str, str]) -> VerificationResult:
        """Authenticate a webhook delivery and parse it. Raise ProviderError if untrusted."""
