"""CIVICSIGN in-app AI help assistant.

Uses Google Gemini (gemini-2.5-flash) via the Emergent universal LLM key through
the `emergentintegrations` library. Conversation history is supplied by the client
(short-lived help widget), so no server-side persistence is required here. The chat
endpoint is public so the floating assistant can also help visitors on the homepage.
"""
import os
import uuid
import logging

from fastapi import APIRouter, HTTPException

from models import ChatRequest

logger = logging.getLogger("civicsign.assistant")

assistant_router = APIRouter(prefix="/api/assistant", tags=["assistant"])

SYSTEM_PROMPT = (
    "You are CivicSign Assistant, the friendly in-app guide for CIVICSIGN, a modern "
    "UK-based e-signature platform. You help both prospective visitors and signed-in users. "
    "Product help topics: uploading PDF or Word documents; the Prepare Studio (drag-and-drop "
    "signature, initials, date, text and checkbox fields; adding recipients; sequential vs "
    "parallel signing order); sending documents for signature; the signer experience (secure "
    "links, draw/type/upload a signature, no account required); templates and the Starter "
    "templates library; bulk send; reminders; envelope expiration; the tamper-evident audit "
    "trail and Certificate of Completion; account settings; and subscription plans. "
    "PRICING (GBP): Free \u00a30/forever, Pro \u00a315/month, Business \u00a349/month. Always quote "
    "prices in pounds (\u00a3), never dollars. "
    "UK E-SIGNATURE LAW (for general information, you are NOT a lawyer): In the UK electronic "
    "signatures are generally legally valid and enforceable where the signatory intends to "
    "authenticate the document and any required formalities are met. Key sources: the Electronic "
    "Communications Act 2000 (foundational statute on legal status and admissibility of e-signatures); "
    "the Electronic Identification and Trust Services for Electronic Transactions Regulations 2016 "
    "(UK eIDAS, which revoked the older Electronic Signatures Regulations 2002); and the Law "
    "Commission's 2019 report confirming an electronic signature can execute a document, including a "
    "deed, where execution formalities are satisfied. UK eIDAS defines three tiers: Simple (SES), "
    "Advanced (AES \u2014 uniquely linked to and identifying the signatory, under their sole control, with "
    "tamper-detection) and Qualified (QES \u2014 an AES with a qualified certificate and qualified signature "
    "creation device, the highest assurance). UK law is technology-neutral: simple e-signatures are "
    "often sufficient for ordinary contracts if intent is clear, while higher-risk matters may warrant "
    "AES/QES. Some documents have special execution formalities. "
    "Guidelines: be concise, warm and actionable; prefer short steps or bullet points; reference exact "
    "UI labels when helpful. If a question is unrelated to CivicSign or e-signatures, politely steer "
    "back. For legal questions, give general UK-focused information and add a brief note suggesting they "
    "consult a qualified solicitor for their specific situation. Never fabricate features that don't exist."
)

MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-2.5-flash"


@assistant_router.post("/chat")
async def chat(body: ChatRequest):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="The AI assistant is not configured yet.")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:  # pragma: no cover
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(status_code=503, detail="The AI assistant is not available.")

    # Keep only the most recent turns to bound token usage.
    history = (body.history or [])[-10:]
    convo_lines = []
    for m in history:
        speaker = "User" if (m.role or "").lower() == "user" else "Assistant"
        convo_lines.append(f"{speaker}: {m.content}")

    if convo_lines:
        prompt = (
            "Conversation so far:\n" + "\n".join(convo_lines) +
            f"\n\nUser's new message: {body.message}\n\nReply as CivicSign Assistant."
        )
    else:
        prompt = body.message

    try:
        chat_client = LlmChat(
            api_key=api_key,
            session_id=f"help_{uuid.uuid4().hex[:12]}",
            system_message=SYSTEM_PROMPT,
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        reply = await chat_client.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"assistant chat error: {e}")
        raise HTTPException(status_code=502, detail="The assistant is temporarily unavailable. Please try again.")

    return {"reply": reply if isinstance(reply, str) else str(reply)}
