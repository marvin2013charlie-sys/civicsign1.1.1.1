"""
UK eIDAS signature tier resolution and evidence for CivicSign.

Tiers (lowest → highest assurance):
  basic — consent, attribution, audit trail, SHA-256 seal (Free plan)
  ses   — Simple Electronic Signature, UK eIDAS Art. 3(11) (Pro+)
  aes   — Advanced Electronic Signature, UK eIDAS Art. 26 (Pro selectable, Business default)
  qes   — Qualified Electronic Signature, UK eIDAS Art. 3(12) (Business via QTSP partner — roadmap)
"""
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
    "aes": "Advanced Electronic Signature (AES)",
    "qes": "Qualified Electronic Signature (QES)",
}

LEVEL_LEGAL_BASIS = {
    "basic": "UK Electronic Communications Act 2000 — electronic signature with audit trail",
    "ses": "UK eIDAS Article 3(11) — Simple Electronic Signature",
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
        "This certificate records a Simple Electronic Signature (SES) under UK eIDAS Article 3(11), "
        "with signer consent, attribution (email, timestamp, IP address), and a SHA-256 document seal. "
        "Any modification to the document after completion will invalidate the hash above."
    ),
    "aes": (
        "This certificate records an Advanced Electronic Signature (AES) under UK eIDAS Article 26. "
        "The signature is uniquely linked to the signatory, capable of identifying them, created under "
        "their sole control, and linked to the document such that any subsequent change is detectable "
        "via the SHA-256 hash above."
    ),
    "qes": (
        "This certificate records a Qualified Electronic Signature (QES) under UK eIDAS Article 3(12), "
        "backed by a qualified certificate from a Qualified Trust Service Provider. "
        "Any modification to the document after completion will invalidate the hash above."
    ),
}


def _effective_plan(user: dict) -> str:
    from plan_features import _effective_plan as ep
    return ep(user)


def allowed_levels_for_user(user: dict) -> list[str]:
    from plan_features import has_feature

    levels: list[str] = ["basic"]
    if has_feature(user, "ses_signatures"):
        levels.append("ses")
    if has_feature(user, "aes_signatures"):
        levels.append("aes")
    if has_feature(user, "qes_available"):
        levels.append("qes")
    return levels


def default_level_for_user(user: dict) -> str:
    from plan_features import has_feature

    if has_feature(user, "aes_signatures") and _effective_plan(user) == "business":
        return "aes"
    if has_feature(user, "ses_signatures"):
        return "ses"
    return "basic"


def resolve_send_signature_level(user: dict, requested: str | None = None) -> str:
    """Pick the envelope signature level at send time, validating plan access."""
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
    if env.get("signature_level") in VALID_LEVELS:
        return env["signature_level"]
    if owner:
        return default_level_for_user(owner)
    return "basic"


def level_audit_label(level: str) -> str:
    return LEVEL_LABELS.get(level, LEVEL_LABELS["basic"])


def consent_audit_detail(level: str) -> str:
    if level == "ses":
        return "Simple Electronic Signature (SES) — UK eIDAS Art. 3(11)"
    if level == "aes":
        return "Advanced Electronic Signature (AES) — UK eIDAS Art. 26"
    if level == "qes":
        return "Qualified Electronic Signature (QES) — UK eIDAS Art. 3(12)"
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
    if level == "aes":
        evidence = {
            "signature_level": "AES",
            "legal_basis": LEVEL_LEGAL_BASIS["aes"],
            "ip": ip,
            "user_agent": user_agent[:200],
            "signed_at": signed_at,
            "signer_email": signer_email,
            "signer_name": signer_name,
            "consent_text": CONSENT_TEXT,
            "criteria": {
                "uniquely_linked": True,
                "identifies_signatory": True,
                "sole_control": True,
                "tamper_detection": True,
            },
        }
        if auth_method and auth_verified:
            evidence["recipient_authentication"] = auth_method
        return evidence
    if level == "qes":
        return {
            "signature_level": "QES",
            "legal_basis": LEVEL_LEGAL_BASIS["qes"],
            "ip": ip,
            "user_agent": user_agent[:200],
            "signed_at": signed_at,
            "signer_email": signer_email,
            "signer_name": signer_name,
            "consent_text": CONSENT_TEXT,
            "qtsp": "Qualified Trust Service Provider (partner integration)",
        }
    return None


def certificate_footer(level: str) -> str:
    return CERTIFICATE_FOOTERS.get(level, CERTIFICATE_FOOTERS["basic"])