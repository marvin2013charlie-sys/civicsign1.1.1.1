"""CIVICSIGN in-app AI help assistant.

Uses Google Gemini (gemini-2.5-flash) via the Emergent universal LLM key through
the `emergentintegrations` library. (The provisioned Emergent key currently
permits Gemini models; switch MODEL_PROVIDER/MODEL_NAME to OpenAI once an
OpenAI-enabled key is supplied.) Conversation history is supplied by the client
(short-lived help widget), so no server-side persistence is required here.
"""
import os
import logging

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from models import ChatRequest

logger = logging.getLogger("civicsign.assistant")

assistant_router = APIRouter(prefix="/api/assistant", tags=["assistant"])

SYSTEM_PROMPT = (
    "You are CivicSign Assistant, the friendly in-app support guide for CIVICSIGN, "
    "a modern e-signature platform. Help users accomplish tasks and answer questions about: "
    "uploading PDF or Word documents; the Prepare Studio (drag-and-drop signature, initials, "
    "date, text and checkbox fields; adding recipients; sequential vs parallel signing order); "
    "sending documents for signature; the signer experience (secure links, draw/type/upload a "
    "signature, no account required); templates and the Starter templates library; bulk send; "
    "reminders; envelope expiration; the tamper-evident audit trail and Certificate of Completion; "
    "account settings (profile, password, mobile); and subscription plans (Free, Pro, Business). "
    "Guidelines: be concise, warm and actionable; prefer short steps or bullet points; reference "
    "the exact UI labels when helpful. If a question is unrelated to CivicSign or e-signatures, "
    "politely steer the user back. You are not a lawyer\u2014if asked for legal advice, give general "
    "information and add a brief note suggesting they consult a qualified professional. "
    "Never fabricate features that don't exist."
)

MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-2.5-flash"


@assistant_router.post("/chat")
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
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
            session_id=f"help_{user['user_id']}",
            system_message=SYSTEM_PROMPT,
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        reply = await chat_client.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"assistant chat error: {e}")
        raise HTTPException(status_code=502, detail="The assistant is temporarily unavailable. Please try again.")

    return {"reply": reply if isinstance(reply, str) else str(reply)}
