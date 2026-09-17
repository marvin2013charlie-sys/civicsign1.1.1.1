"""Electronic signature evidence. AES/QES are disabled until independently supported."""
from __future__ import annotations

from fastapi import HTTPException

VALID_LEVELS = ("basic", "ses", "aes", "qes")

CONSENT_TEXT = (
    "I agree to use electronic records and signatures, and I consent to "
    "conduct this transaction electronically in accordance with the UK "
    "Electronic Communications Act 2000 and the UK eIDAS Regulation."
)

LEVEL_LABELS = {
    "basic": "Electronic signature",
    "ses": "Simple Electronic Signature (SES)",
    "aes": "Electronic signature (legacy AES label, assurance unverified)",
    "qes": "Electronic signature (legacy QES label, assurance unverified)",
}

LEVEL_LEGAL_BASIS = {
    "basic": "UK Electronic Communications Act 2000 — electronic signature with audit trail",
    "ses": "UK eIDAS Article 3(10) — electronic signature",
    "aes": "UK eIDAS Article 26 — Advanced Electronic Signature",
    "qes": "UK eIDAS Article 3(12) — Qualified Electronic Signature",
}

CERTIFICATE_FOOTERS = {
    "basic": (
        "This certificate is a tamper-evident record of the electronic signature transaction "
        "described above, generated in accordance with the UK Electronic Communications Act 2000 "
        "and UK eIDAS principles of intent, consent, attribution, and record retention. "
        "Any modification to the document after completion will invalidate the hash above."
    ),
    "ses": (
        "This certificate records a Simple Electronic Signature (SES) under UK eIDAS Article 3(10), "
        "with signer consent, attribution (email, timestamp, IP address), and a SHA-256 document seal. "
        "Any modification to the document after completion will invalidate the hash above."
    ),
    "aes": "Legacy AES label: advanced signature requirements were not verified. This record does not establish AES compliance.",
    "qes": "Legacy QES label: no qualified certificate or qualified signature creation device was verified. This record does not establish QES compliance.",
}


def _effective_plan(user: dict) -> str:
    from plan_features import _effective_plan as ep
    return ep(user)


def allowed_levels_for_user(user: dict) -> list[str]:
    from plan_features import has_feature

    levels: list[str] = ["basic"]
    if has_feature(user, "ses_signatures"):
        levels.append("ses")
    return levels


def default_level_for_user(user: dict) -> str:
    from plan_features import has_feature

    if has_feature(user, "ses_signatures"):
        return "ses"
    return "basic"


def resolve_send_signature_level(user: dict, requested: str | None = None) -> str:
    """Pick the envelope signature level at send time, validating plan access."""
    if requested and requested.lower().strip() in {"aes", "qes"}:
        raise HTTPException(400, "AES and QES are unavailable: their assurance requirements are not implemented. Choose an electronic signature instead.")
    allowed = allowed_levels_for_user(user)
    default = default_level_for_user(user)
    if not requested:
        return default
    level = requested.lower().strip()
    if level not in VALID_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"signature_level must be one of: {', '.join(VALID_LEVELS)}",
        )
    if level not in allowed:
        if level == "qes":
            raise HTTPException(
                status_code=402,
                detail=(
                    "Qualified Electronic Signatures (QES) require a Business plan and a "
                    "Qualified Trust Service Provider integration. Contact us to enable QES."
                ),
            )
        if level in ("ses", "aes"):
            raise HTTPException(
                status_code=402,
                detail="This signature level requires a Pro plan or higher. Upgrade in Settings → Subscription.",
            )
        raise HTTPException(status_code=402, detail="This signature level is not available on your plan.")
    return level


def resolve_signer_view_level(env: dict, owner: dict | None) -> str:
    """Level shown to the signer — fall back from envelope or owner plan."""
    if env.get("signature_level") in {"aes", "qes"}:
        return "ses"
    if env.get("signature_level") in VALID_LEVELS:
        return env["signature_level"]
    if owner:
        return default_level_for_user(owner)
    return "basic"


def level_audit_label(level: str) -> str:
    return LEVEL_LABELS.get(level, LEVEL_LABELS["basic"])


def consent_audit_detail(level: str) -> str:
    if level == "ses":
        return "Simple Electronic Signature (SES) — UK eIDAS Art. 3(10)"
    return "Electronic signature consent accepted"


def signed_audit_detail(level: str, field_count: int) -> str:
    label = level_audit_label(level)
    return f"{label} applied — {field_count} field(s) completed"


def build_signer_evidence(
    level: str,
    *,
    ip: str,
    user_agent: str,
    signed_at: str,
    signer_email: str,
    signer_name: str,
    auth_method: str | None = None,
    auth_verified: bool = False,
) -> dict | None:
    """Per-recipient evidence stored on the envelope at sign time."""
    if level in {"aes", "qes"}:
        level = "ses"
    if level == "basic":
        return {
            "signature_level": "basic",
            "legal_basis": LEVEL_LEGAL_BASIS["basic"],
            "ip": ip,
            "user_agent": user_agent[:200],
            "signed_at": signed_at,
            "signer_email": signer_email,
            "signer_name": signer_name,
            "consent_text": CONSENT_TEXT,
        }
    if level == "ses":
        return {
            "signature_level": "SES",
            "legal_basis": LEVEL_LEGAL_BASIS["ses"],
            "ip": ip,
            "user_agent": user_agent[:200],
            "signed_at": signed_at,
            "signer_email": signer_email,
            "signer_name": signer_name,
            "consent_text": CONSENT_TEXT,
        }
    return None


def certificate_footer(level: str) -> str:
    return CERTIFICATE_FOOTERS.get(level, CERTIFICATE_FOOTERS["basic"])