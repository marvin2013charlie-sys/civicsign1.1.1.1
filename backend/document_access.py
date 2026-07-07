"""Document byte access control — sender + signers only; staff never."""
from fastapi import HTTPException


PRIVILEGED_ROLES = frozenset({"admin", "staff"})


def is_privileged_session(user: dict) -> bool:
    """True when support/staff is viewing via impersonation or internal role."""
    return bool(user.get("_impersonating")) or user.get("role") in PRIVILEGED_ROLES


def assert_sender_can_view_document(user: dict, env: dict) -> None:
    """
    Block staff and impersonation sessions from reading PDF bytes.
    Only the envelope owner (real user session) may download sender-side files.
    """
    if is_privileged_session(user):
        raise HTTPException(
            status_code=403,
            detail=(
                "Document content is encrypted and unavailable during support access. "
                "Ask the customer to share the file directly if needed."
            ),
        )
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