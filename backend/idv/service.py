"""Orchestration for identity verification.

Everything CivicSign keeps about a verification lives here: the record, the
name match, the audit entries and the gate that unlocks signing. Providers are
interchangeable; this file is not.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone

from db import db
from idv.mock import MockProvider
from idv.provider import (
    ALL_CHECKS,
    DEFAULT_CHECKS,
    STATUS_FAILED,
    STATUS_VERIFIED,
    IdentityProvider,
    VerificationResult,
)

logger = logging.getLogger("civicsign.idv")

_PROVIDERS: dict[str, IdentityProvider] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def provider_name() -> str:
    return (os.environ.get("IDV_PROVIDER") or "mock").strip().lower()


def get_provider() -> IdentityProvider:
    """Return the configured provider, built once per process."""
    name = provider_name()
    if name not in _PROVIDERS:
        if name == "mock":
            _PROVIDERS[name] = MockProvider()
        else:
            # Phase 1 registers real providers here.
            raise ValueError(f"Unknown IDV_PROVIDER '{name}'")
    return _PROVIDERS[name]


def idv_available() -> bool:
    """Whether senders may require identity verification right now."""
    try:
        get_provider()
    except ValueError:
        logger.warning(f"[idv] IDV_PROVIDER '{provider_name()}' is not implemented")
        return False
    if provider_name() == "mock":
        from security_utils import is_dev_mode

        return is_dev_mode()
    return True


def normalise_checks(requested) -> tuple[str, ...]:
    """Validate requested checks, falling back to the default set."""
    if not requested:
        return DEFAULT_CHECKS
    cleaned = tuple(
        c for c in (str(x).lower().strip() for x in requested) if c in ALL_CHECKS
    )
    return cleaned or DEFAULT_CHECKS


# Apostrophes vanish (O'Connor and OConnor are one name); anything else
# separates tokens, so hyphenated and double-barrelled names compare equal.
_NAME_APOSTROPHE = re.compile(r"[\u2019'`]")
_NAME_NOISE = re.compile(r"[^a-z0-9 ]+")


def _name_tokens(value: str) -> set[str]:
    lowered = _NAME_APOSTROPHE.sub("", (value or "").lower())
    cleaned = _NAME_NOISE.sub(" ", lowered)
    return {t for t in cleaned.split() if len(t) > 1}


def names_match(document_name: str | None, recipient_name: str | None) -> bool:
    """Does the verified document belong to the person the sender addressed?

    Extra forenames on the document are fine; a missing recipient name token is
    not. Without this a verification proves only that someone real turned up.
    """
    doc = _name_tokens(document_name or "")
    expected = _name_tokens(recipient_name or "")
    if not doc or not expected:
        return False
    return expected.issubset(doc)


async def start_verification(
    envelope: dict, recipient: dict, *, return_url: str
) -> dict:
    """Create a verification record and a provider session for this recipient."""
    provider = get_provider()
    verification_id = f"idv_{uuid.uuid4().hex[:16]}"
    checks = normalise_checks(recipient.get("idv_required_checks"))

    session = await asyncio.to_thread(
        provider.start_session,
        verification_id=verification_id,
        signer_name=recipient.get("name") or "",
        signer_email=recipient.get("email") or "",
        required_checks=checks,
        return_url=return_url,
    )

    doc = {
        "verification_id": verification_id,
        "envelope_id": envelope["envelope_id"],
        "recipient_id": recipient["recipient_id"],
        "owner_id": envelope.get("owner_id"),
        "provider": session.provider,
        "provider_ref": session.provider_ref,
        "status": "pending",
        "required_checks": list(checks),
        "checks": {},
        "name_match": None,
        "failure_reason": None,
        "created_at": _now(),
        "updated_at": _now(),
        "expires_at": session.expires_at,
        "completed_at": None,
    }
    await db.identity_verifications.insert_one(dict(doc))

    await _set_recipient_fields(
        envelope["envelope_id"],
        recipient["recipient_id"],
        {"idv_status": "in_progress", "idv_verification_id": verification_id},
    )
    await _append_audit(
        envelope["envelope_id"],
        actor=recipient.get("email"),
        action="Identity verification started",
    )
    doc.pop("_id", None)
    return {**doc, "redirect_url": session.redirect_url}


async def apply_result(verification_id: str, result: VerificationResult) -> dict:
    """Record a provider answer, then unlock signing only if everything passed."""
    record = await db.identity_verifications.find_one(
        {"verification_id": verification_id}, {"_id": 0}
    )
    if not record:
        raise KeyError(verification_id)
    if record["status"] in ("verified", "failed", "expired"):
        return record  # already settled; providers may deliver twice

    envelope = await db.envelopes.find_one(
        {"envelope_id": record["envelope_id"]}, {"_id": 0}
    )
    recipient = next(
        (
            r
            for r in (envelope or {}).get("recipients", [])
            if r.get("recipient_id") == record["recipient_id"]
        ),
        None,
    )

    status = result.status
    failure_reason = result.failure_reason
    name_match = None
    if status == STATUS_VERIFIED and recipient is not None:
        name_match = names_match(result.document_name, recipient.get("name"))
        if not name_match:
            status = STATUS_FAILED
            failure_reason = "The verified document is in a different name to the recipient"

    updates = {
        "status": status,
        "checks": dict(result.checks),
        "name_match": name_match,
        "failure_reason": failure_reason,
        "completed_at": result.completed_at or _now(),
        "updated_at": _now(),
    }
    await db.identity_verifications.update_one(
        {"verification_id": verification_id}, {"$set": updates}
    )

    if envelope and recipient is not None:
        passed = status == STATUS_VERIFIED
        fields = {"idv_status": status}
        if passed:
            # The identity gate is the same gate SMS and postcode use.
            fields["auth_verified"] = True
        await _set_recipient_fields(
            envelope["envelope_id"], recipient["recipient_id"], fields
        )
        await _append_audit(
            envelope["envelope_id"],
            actor=recipient.get("email"),
            action=(
                "Identity verified"
                if passed
                else f"Identity verification {status}"
                + (f" — {failure_reason}" if failure_reason else "")
            ),
        )
        logger.info(
            f"[idv] {verification_id} {status} envelope={envelope['envelope_id']} "
            f"recipient={recipient['recipient_id']}"
        )

    return {**record, **updates}


async def refresh_from_provider(verification_id: str) -> dict:
    """Poll the provider for a verification that has not settled yet."""
    record = await db.identity_verifications.find_one(
        {"verification_id": verification_id}, {"_id": 0}
    )
    if not record:
        raise KeyError(verification_id)
    if record["status"] != "pending":
        return record
    provider = get_provider()
    result = await asyncio.to_thread(provider.fetch_result, record["provider_ref"])
    if not result.is_terminal:
        return record
    return await apply_result(verification_id, result)


def evidence_for_certificate(record: dict | None) -> dict | None:
    """The subset that belongs on the signing certificate — never raw biometrics."""
    if not record or record.get("status") != "verified":
        return None
    return {
        "verification_id": record["verification_id"],
        "provider": record.get("provider"),
        "checks_passed": sorted(
            k for k, v in (record.get("checks") or {}).items() if v == "passed"
        ),
        "name_match": bool(record.get("name_match")),
        "verified_at": record.get("completed_at"),
    }


async def _set_recipient_fields(envelope_id: str, recipient_id: str, fields: dict) -> None:
    await db.envelopes.update_one(
        {"envelope_id": envelope_id, "recipients.recipient_id": recipient_id},
        {"$set": {f"recipients.$.{k}": v for k, v in fields.items()}
                 | {"updated_at": _now()}},
    )


async def _append_audit(envelope_id: str, *, actor: str | None, action: str) -> None:
    await db.envelopes.update_one(
        {"envelope_id": envelope_id},
        {"$push": {"audit_events": {"at": _now(), "actor": actor, "action": action}}},
    )
