"""Identity verification: provider-agnostic orchestration.

CivicSign owns the session lifecycle, the evidence and the certificate entry.
Providers only answer one question — did this person pass these checks — so a
provider can be swapped without touching the signer flow or the stored record.
"""
from idv.provider import (  # noqa: F401
    ALL_CHECKS,
    DEFAULT_CHECKS,
    IdentityProvider,
    VerificationResult,
    VerificationSession,
)
