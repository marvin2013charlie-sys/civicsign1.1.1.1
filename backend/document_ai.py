"""AI-assisted document preparation: summary, field suggestions, message drafting."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from db import db, download_document_file
from auth import get_current_user
from document_access import assert_can_run_document_ai
from rate_limits import limiter
import pdf_service
from llm import chat_completion, is_configured, parse_json_object

logger = logging.getLogger("civicsign.document_ai")

ai_router = APIRouter(prefix="/api", tags=["document-ai"])

FIELD_DEFAULTS = {
    "signature": {"w": 0.22, "h": 0.045},
    "initials": {"w": 0.08, "h": 0.035},
    "date": {"w": 0.12, "h": 0.03},
    "text": {"w": 0.25, "h": 0.03},
    "fullname": {"w": 0.28, "h": 0.03},
    "checkbox": {"w": 0.025, "h": 0.025},
}

VALID_FIELD_TYPES = set(FIELD_DEFAULTS) | {"email", "company", "signdate"}


async def _owned_envelope(envelope_id: str, user: dict) -> dict:
    env = await db.envelopes.find_one({"envelope_id": envelope_id}, {"_id": 0})
    if not env or env.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=404, detail="Envelope not found")
    return env


async def _envelope_text(env: dict, max_chars: int = 12000) -> str:
    file_id = env.get("document", {}).get("file_id")
    if not file_id:
        return ""
    try:
        pdf_bytes = await download_document_file(
            file_id, "envelope", env["envelope_id"],
        )
        return pdf_service.extract_pdf_text(pdf_bytes, max_chars=max_chars)
    except Exception as e:
        logger.warning(f"[document_ai] text extract failed: {e}")
        return ""


def _heuristic_summary(title: str, text: str) -> dict:
    lower = (title + " " + text[:2000]).lower()
    doc_type = "Document"
    for label, keys in (
        ("NDA / Confidentiality", ("nda", "non-disclosure", "confidential")),
        ("Employment contract", ("employment", "employee", "salary", "job title")),
        ("Service agreement", ("service agreement", "services", "contractor")),
        ("Lease / Tenancy", ("lease", "tenancy", "landlord", "tenant")),
        ("Consent form", ("consent", "agree to", "permission")),
        ("Share subscription / deed", ("share subscription", "founder share", "parties to this deed")),
    ):
        if any(k in lower for k in keys):
            doc_type = label
            break
    bullets = [
        f"Document titled «{title or 'Untitled'}».",
        f"Detected type: {doc_type}.",
        "Review field placement before sending — AI suggestions are a starting point only.",
    ]
    if "signature" in lower or "sign here" in lower or "signed" in lower:
        bullets.append("Contains signature-related language — place signature and date fields.")
    return {"doc_type": doc_type, "summary": bullets, "source": "basic"}


def _heuristic_fields(text: str, page_count: int) -> list[dict]:
    """Rule-based field placement when LLM is offline."""
    lower = text.lower()
    suggestions = []
    last_page = max(0, page_count - 1)
    deed_style = any(
        k in lower
        for k in (
            "deed date", "parties to this", "subscription price",
            "founder share", "share subscription", "executed as a deed",
        )
    )
    sig_page = 0 if deed_style and page_count > 1 else last_page
    sig_y = 0.90 if deed_style else 0.78
    date_y = sig_y

    if any(k in lower for k in ("signature", "sign here", "signed by", "executed")):
        suggestions.append({
            "page": sig_page, "type": "signature", "x": 0.08, "y": sig_y,
            "label": "Signature", "required": True,
        })
        suggestions.append({
            "page": sig_page, "type": "date", "x": 0.55, "y": date_y,
            "label": "Date", "required": True,
        })
    if any(k in lower for k in ("print name", "full name", "name:")):
        suggestions.append({
            "page": last_page, "type": "fullname", "x": 0.08, "y": 0.72,
            "label": "Full name", "required": True,
        })
    if not suggestions:
        suggestions.append({
            "page": sig_page, "type": "signature", "x": 0.1, "y": sig_y if deed_style else 0.8,
            "label": "Signature", "required": True,
        })
    return _normalize_suggestions(suggestions, page_count)


def _normalize_suggestions(raw: list, page_count: int) -> list[dict]:
    out = []
    for item in raw[:20]:
        if not isinstance(item, dict):
            continue
        ftype = str(item.get("type", "signature")).lower()
        if ftype not in VALID_FIELD_TYPES:
            ftype = "signature"
        defaults = FIELD_DEFAULTS.get(ftype, FIELD_DEFAULTS["text"])
        page = int(item.get("page", 0))
        page = max(0, min(page, max(0, page_count - 1)))
        w = float(item.get("w", defaults["w"]))
        h = float(item.get("h", defaults["h"]))
        x = float(item.get("x", 0.1))
        y = float(item.get("y", 0.75))
        x = max(0, min(x, 1 - w))
        y = max(0, min(y, 1 - h))
        out.append({
            "page": page,
            "type": ftype,
            "x": round(x, 4),
            "y": round(y, 4),
            "w": round(w, 4),
            "h": round(h, 4),
            "label": str(item.get("label", ""))[:80] or None,
            "required": bool(item.get("required", True)),
        })
    return out


@ai_router.get("/envelopes/{envelope_id}/ai/summary")
@limiter.limit("30/hour")
async def envelope_summary(request: Request, envelope_id: str, user: dict = Depends(get_current_user)):
    assert_can_run_document_ai(user)
    env = await _owned_envelope(envelope_id, user)
    title = env.get("title", "Untitled")
    text = await _envelope_text(env)

    if is_configured() and text:
        prompt = (
            f"Document title: {title}\n\nExtracted text (truncated):\n{text[:8000]}\n\n"
            "Return JSON: {\"doc_type\": \"short label e.g. NDA\", "
            "\"summary\": [\"3-5 concise bullets for the sender\"]}"
        )
        raw = await chat_completion(
            system="You summarise UK business documents for an e-signature platform. Be concise and practical.",
            user=prompt,
            max_tokens=350,
            json_mode=True,
        )
        data = parse_json_object(raw or "")
        if data and isinstance(data.get("summary"), list):
            bullets = [str(b)[:300] for b in data["summary"][:6]]
            return {
                "doc_type": str(data.get("doc_type", "Document"))[:80],
                "summary": bullets,
                "source": "ai",
            }

    return _heuristic_summary(title, text)


async def _envelope_pdf_bytes(env: dict) -> bytes:
    file_id = env.get("document", {}).get("file_id")
    if not file_id:
        return b""
    return await download_document_file(file_id, "envelope", env["envelope_id"])


@ai_router.post("/envelopes/{envelope_id}/ai/suggest-fields")
@limiter.limit("20/hour")
async def suggest_fields(request: Request, envelope_id: str, user: dict = Depends(get_current_user)):
    assert_can_run_document_ai(user)
    env = await _owned_envelope(envelope_id, user)
    page_count = env.get("document", {}).get("page_count", 1) or 1
    text = await _envelope_text(env)
    recipients = env.get("recipients") or []

    try:
        pdf_bytes = await _envelope_pdf_bytes(env)
        if pdf_bytes:
            anchored = pdf_service.find_anchor_fields(pdf_bytes)
            if anchored:
                fields = _normalize_suggestions(anchored, page_count)
                if fields:
                    return {"fields": fields, "source": "anchors"}
    except Exception as e:
        logger.warning(f"[document_ai] anchor fields failed: {e}")

    if is_configured() and text:
        prompt = (
            f"Title: {env.get('title', '')}\nPages: {page_count}\n"
            f"Recipients: {len(recipients)}\n\nText:\n{text[:10000]}\n\n"
            "Suggest signature/date/text fields. Coordinates are fractions 0-1 (top-left origin). "
            "Return JSON: {\"fields\": [{\"page\": 0, \"type\": \"signature|date|text|fullname|initials|checkbox\", "
            "\"x\": 0.1, \"y\": 0.8, \"w\": 0.2, \"h\": 0.04, \"label\": \"optional\", \"required\": true}]}"
        )
        raw = await chat_completion(
            system=(
                "You place e-signature fields on PDFs. Prefer bottom of last page for signatures. "
                "Use UK English. Only return valid JSON."
            ),
            user=prompt,
            max_tokens=600,
            json_mode=True,
        )
        data = parse_json_object(raw or "")
        if data and isinstance(data.get("fields"), list):
            fields = _normalize_suggestions(data["fields"], page_count)
            if fields:
                return {"fields": fields, "source": "ai"}

    fields = _heuristic_fields(text, page_count)
    return {"fields": fields, "source": "heuristic" if text else "basic"}


@ai_router.post("/envelopes/{envelope_id}/ai/draft-message")
@limiter.limit("30/hour")
async def draft_message(request: Request, envelope_id: str, user: dict = Depends(get_current_user)):
    env = await _owned_envelope(envelope_id, user)
    title = env.get("title", "Document")
    names = [r.get("name") or r.get("email", "") for r in (env.get("recipients") or [])]
    sender = user.get("name") or user.get("email", "")

    if is_configured():
        prompt = (
            f"Draft a short, professional signing request email body (2-4 sentences, UK English).\n"
            f"Sender: {sender}\nDocument: {title}\nRecipients: {', '.join(names) or 'the recipient'}\n"
            "No subject line. No placeholders. Warm but businesslike."
        )
        raw = await chat_completion(
            system="You write concise signing invitation messages for CivicSign, a UK e-signature platform.",
            user=prompt,
            max_tokens=200,
            temperature=0.5,
        )
        if raw:
            return {"message": raw.strip(), "source": "ai"}

    names_str = names[0] if len(names) == 1 else "you"
    return {
        "message": (
            f"Hello{' ' + names_str if names else ''},\n\n"
            f"Please review and sign «{title}» at your earliest convenience. "
            "Use the secure link in this email — no account is required.\n\n"
            f"Thank you,\n{sender}"
        ),
        "source": "template",
    }


@ai_router.get("/recipients/suggestions")
@limiter.limit("60/minute")
async def recipient_suggestions(
    request: Request,
    q: str = Query("", max_length=80),
    user: dict = Depends(get_current_user),
):
    """Recent signer contacts for autocomplete in Prepare Studio."""
    needle = q.strip().lower()
    envs = await db.envelopes.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "recipients": 1},
    ).sort("created_at", -1).limit(150).to_list(150)

    seen = set()
    out = []
    for env in envs:
        for r in env.get("recipients") or []:
            email = (r.get("email") or "").strip().lower()
            name = (r.get("name") or "").strip()
            if not email or email in seen:
                continue
            hay = f"{name} {email}".lower()
            if needle and needle not in hay:
                continue
            seen.add(email)
            out.append({"name": name, "email": email})
            if len(out) >= 12:
                return out
    return out