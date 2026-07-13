"""Document byte access control — sender + signers only; staff never."""
from __future__ import annotations

import copy

from fastapi import HTTPException


PRIVILEGED_ROLES = frozenset({"admin", "staff"})

DOCUMENT_ACCESS_DENIED = (
    "Document content is encrypted and unavailable during support access. "
    "Ask the customer to share the file directly if needed."
)

CONFIDENTIAL_METADATA_DENIED = (
    "Envelope details are restricted during support access to protect confidential information."
)


def is_privileged_session(user: dict) -> bool:
    """True when support/staff is viewing via impersonation or internal role."""
    return bool(user.get("_impersonating")) or user.get("role") in PRIVILEGED_ROLES


def assert_can_access_document_bytes(user: dict) -> None:
    """Block any decrypted PDF/workspace byte access for staff or impersonation."""
    if is_privileged_session(user):
        raise HTTPException(status_code=403, detail=DOCUMENT_ACCESS_DENIED)


def assert_can_view_envelope_confidential(user: dict) -> None:
    """Block seal bulk-verify and similar flows that read stored customer PDFs."""
    if is_privileged_session(user):
        raise HTTPException(status_code=403, detail=CONFIDENTIAL_METADATA_DENIED)


def redact_envelope_for_privileged(env: dict) -> dict:
    """Strip titles, recipients, messages, and file pointers for support sessions."""
    if not env:
        return env
    out = copy.deepcopy(env)
    out["title"] = "Confidential document"
    out["message"] = ""
    out.pop("completed_file_id", None)
    doc = out.get("document")
    if isinstance(doc, dict):
        out["document"] = {
            "file_type": doc.get("file_type"),
            "page_count": doc.get("page_count"),
        }
    recipients = []
    for rec in out.get("recipients") or []:
        if not isinstance(rec, dict):
            continue
        recipients.append({
            "recipient_id": rec.get("recipient_id"),
            "role": rec.get("role"),
            "status": rec.get("status"),
            "routing_order": rec.get("routing_order"),
        })
    out["recipients"] = recipients
    fields = []
    for field in out.get("fields") or []:
        if not isinstance(field, dict):
            continue
        fields.append({
            "field_id": field.get("field_id"),
            "type": field.get("type"),
            "page": field.get("page"),
            "required": field.get("required"),
        })
    out["fields"] = fields
    audit = []
    for event in out.get("audit_events") or []:
        if not isinstance(event, dict):
            continue
        audit.append({
            "at": event.get("at"),
            "actor": event.get("actor"),
            "action": event.get("action"),
        })
    out["audit_events"] = audit
    return out


def maybe_redact_envelope(user: dict, env: dict) -> dict:
    if is_privileged_session(user):
        return redact_envelope_for_privileged(env)
    return env


def assert_sender_can_view_document(user: dict, env: dict) -> None:
    """
    Block staff and impersonation sessions from reading PDF bytes.
    Only the envelope owner (real user session) may download sender-side files.
    """
    if is_privileged_session(user):
        raise HTTPException(status_code=403, detail=DOCUMENT_ACCESS_DENIED)
    if env.get("owner_id") != user.get("user_id"):
        raise HTTPException(status_code=404, detail="Envelope not found")


def assert_template_owner_can_view(user: dict, tpl: dict) -> None:
    if is_privileged_session(user):
        raise HTTPException(
            status_code=403,
            detail="Template documents are encrypted and unavailable during support access.",
        )
    owner_id = tpl.get("owner_id")
    if owner_id and owner_id != user.get("user_id"):
        # Shared team templates are metadata-only for non-owners on file bytes.
        raise HTTPException(status_code=403, detail="You do not have access to this template file")


def assert_can_run_document_ai(user: dict) -> None:
    """AI reads decrypted PDF text — same rules as sender file access."""
    if is_privileged_session(user):
        raise HTTPException(
            status_code=403,
            detail="Document analysis is disabled during support access to protect encrypted content.",
        )