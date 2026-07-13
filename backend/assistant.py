"""CivicSign in-app AI help assistant."""
import logging

from fastapi import APIRouter, HTTPException, Request

from models import AuthChatRequest, ChatRequest
from auth import _access_token_from_request, user_from_access_token
from auth_assistant import CONTEXT_GREETINGS, generate_auth_reply
from rate_limits import limiter, auth_limit
from brand import CONTACT_EMAIL
from product_assistant import (
    PRODUCT_FALLBACK,
    PRODUCT_SYSTEM_FACTS,
    generate_product_reply,
)

logger = logging.getLogger("civicsign.assistant")

assistant_router = APIRouter(prefix="/api/assistant", tags=["assistant"])

SYSTEM_PROMPT = (
    "You are CivicSign Assistant on the public marketing site — a warm, practical UK e-signature copilot. "
    "CivicSign is a 2-in-1 platform: **e-signatures** (Prepare Studio, send, sign, audit trail) plus "
    "**Manage PDF** on all paid plans (Pro, Business, Organisation) — not on Free. Manage PDF covers edit, "
    "compress, watermark, protect, unlock, merge, split, Word/PDF convert, and AI metadata scan; save to "
    "Documents then open in Prepare Studio. Industry solution pages live at /solutions (real estate, legal, "
    "HR, healthcare, education, charities, construction, finance, staffing). "
    "Topics you cover: uploading PDF/Word; Prepare Studio fields; recipients; sequential vs parallel signing; "
    "signer experience (no account); templates; bulk send (Business); reminders; audit trail & Certificate "
    "of Completion; plans, quotas, extra documents; upgrades; Organisation plans. "
    + PRODUCT_SYSTEM_FACTS
    + " "
    "UK LAW (general info only — you are NOT a lawyer): E-signatures are generally valid in the UK when intent "
    "is clear (Electronic Communications Act 2000; UK eIDAS 2016; Law Commission 2019 on deeds). Tiers: SES, "
    "AES, QES. "
    "REPLY STYLE (mandatory): "
    "1) Lead with one direct sentence answering the question. "
    "2) Then use short bullet steps (•) or a tight list — max 6 bullets unless listing full pricing. "
    "3) Name UI labels plainly — e.g. Settings → Subscription, Dashboard → Prepare. No markdown or asterisks. "
    "4) UK spelling; prices in £ only; under ~130 words unless pricing tables. "
    "5) No markdown headings (#), no filler openers ('Sure!', 'Great question!'). "
    "6) If off-topic, steer back in one sentence. For legal edge cases, suggest a solicitor briefly. "
    "Never invent features."
)

FALLBACK_REPLY = PRODUCT_FALLBACK


async def _reject_authenticated_chat(request: Request) -> None:
    """In-app assistant is public-site only — not while signed in."""
    token = _access_token_from_request(request)
    if not token:
        return
    try:
        await user_from_access_token(token)
    except HTTPException:
        return
    raise HTTPException(
        status_code=403,
        detail=(
            "The assistant is not available while you are signed in. "
            "Use Settings → Help & Support, or visit our public site."
        ),
    )


@assistant_router.post("/chat")
@limiter.limit("40/hour")
async def chat(request: Request, body: ChatRequest):
    await _reject_authenticated_chat(request)
    history = [{"role": m.role, "content": m.content} for m in (body.history or [])]
    reply = await generate_product_reply(
        body.message,
        history=history,
        system_prompt=SYSTEM_PROMPT,
    )
    return {"reply": reply or FALLBACK_REPLY}


@assistant_router.post("/auth-chat")
@limiter.limit(auth_limit("30/hour", "300/hour"))
async def auth_chat(request: Request, body: AuthChatRequest):
    """Public AI copilot for the sign-in / registration portal."""
    ctx = (body.context or "login").lower().strip()
    if ctx not in CONTEXT_GREETINGS:
        ctx = "login"
    history = [{"role": m.role, "content": m.content} for m in (body.history or [])]
    reply = await generate_auth_reply(body.message, context=ctx, history=history)
    return {"reply": reply, "context": ctx}