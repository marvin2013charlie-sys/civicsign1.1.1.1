"""AI sign-in copilot — rule-based help with optional OpenAI enhancement."""
from __future__ import annotations

import logging
import os
import re
from typing import List, Optional

logger = logging.getLogger("civicsign.auth_assistant")

AUTH_SYSTEM_PROMPT = (
    "You are CivicSign Sign-in Copilot, a friendly assistant on the login and registration portal. "
    "You ONLY help with: signing in, creating an account, email verification, password reset, "
    "session/security questions, and getting started after signup. "
    "Be concise (under 120 words), use short bullet steps when helpful. "
    "Password rules: 8+ characters, 1 capital, 1 number, 1 special character. "
    "If locked out after failed attempts, wait 15 minutes or use Forgot password. "
    "Rate limits in production protect accounts — suggest waiting a few minutes if they hit limits. "
    "Never ask for or store passwords. Never claim to reset accounts yourself — direct users to "
    "Forgot password or Resend verification buttons on the page. "
    "CivicSign is UK GDPR-focused e-signature SaaS. Free plan: 2 docs/month; Pro £15/mo (100 docs); "
    "Business £79/mo (500 docs). Extra documents available when at monthly limit. "
    "Do not discuss unrelated topics; steer back to account access."
)

CONTEXT_GREETINGS = {
    "login": (
        "Hi — I'm your Sign-in Copilot. Stuck logging in, verifying email, or resetting a password? "
        "Ask me anything about getting into your account."
    ),
    "register": (
        "Welcome! I can walk you through creating your account, password rules, and what happens "
        "after you verify your email."
    ),
    "verify": (
        "Almost there! I can help with verification codes, resending emails, and what to do if "
        "the code doesn't arrive."
    ),
    "forgot": (
        "I'll help you recover access. Reset links are single-use and expire in one hour."
    ),
    "reset": (
        "Set a strong new password — I can explain the requirements or what to do if your link expired."
    ),
}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def _password_strength_hint(password: str) -> str:
    if not password:
        return (
            "Password must include:\n"
            "• At least 8 characters\n"
            "• 1 capital letter (A–Z)\n"
            "• 1 number\n"
            "• 1 special character (!@#$ etc.)"
        )
    issues = []
    if len(password) < 8:
        issues.append("add more characters (minimum 8)")
    if not re.search(r"[A-Z]", password):
        issues.append("add a capital letter")
    if not re.search(r"\d", password):
        issues.append("add a number")
    if not re.search(r"[^A-Za-z0-9]", password):
        issues.append("add a special character")
    if not issues:
        return "That password meets CivicSign's requirements — you're good to go."
    return "To meet our password rules, " + ", ".join(issues) + "."


def rule_based_reply(message: str, context: str = "login") -> Optional[str]:
    """Return a curated answer when we recognise the intent."""
    m = _norm(message)
    ctx = context if context in CONTEXT_GREETINGS else "login"

    # Extract quoted password for strength checks
    pwd_match = re.search(r"password[:\s]+(\S+)", message, re.I)
    if pwd_match or "password requirement" in m or "strong password" in m:
        if "check" in m or "strong" in m or pwd_match:
            return _password_strength_hint(pwd_match.group(1) if pwd_match else "")

    if any(k in m for k in ("too many", "rate limit", "locked", "attempts", "try again")):
        return (
            "That message usually means either:\n\n"
            "1. **Account lockout** — after several wrong passwords, wait **15 minutes** then try again.\n"
            "2. **Rate limit** — too many login tries from your network; wait **5–10 minutes**.\n\n"
            "Tips:\n"
            "• Use **Forgot password** if you're unsure of your password\n"
            "• Double-check email spelling (no extra spaces)\n"
            "• Try an incognito window to clear stale cookies\n\n"
            "If you just reset your password, use the **new** one only."
        )

    if any(k in m for k in ("forgot", "reset password", "lost password", "can't remember")):
        return (
            "To reset your password:\n"
            "1. Tap **Forgot password?** on the sign-in form\n"
            "2. Enter your account email\n"
            "3. Open the link in the email (valid for **1 hour**, single use)\n"
            "4. Choose a new password and sign in\n\n"
            "In local dev mode without email, the reset link may appear on screen after you submit."
        )

    if any(k in m for k in ("verify", "verification", "code", "6 digit", "email confirm")):
        return (
            "Email verification steps:\n"
            "1. Check inbox **and spam** for a 6-digit code\n"
            "2. Enter all 6 digits on the verify page\n"
            "3. Tap **Resend code** if it's been a few minutes\n\n"
            "From sign-in, use the **Need to verify your email?** box to resend a code without logging in."
        )

    if any(k in m for k in ("invalid", "wrong password", "can't log in", "cannot log in", "login fail", "sign in fail")):
        return (
            "Troubleshooting sign-in:\n"
            "• Confirm email is correct (the one you registered with)\n"
            "• Password is case-sensitive — check Caps Lock\n"
            "• If you registered but never verified, use **Resend code** on this page\n"
            "• Use **Forgot password** if you need a fresh password\n"
            "• Clear browser cookies or try incognito\n\n"
            "Still stuck? Create a support ticket via our Contact page."
        )

    if any(k in m for k in ("session", "signed out", "expired", "idle")):
        return (
            "CivicSign signs you out automatically after **10 minutes** of inactivity to protect your documents. "
            "If you see 'session expired', just sign in again — you'll return to where you left off if you were "
            "redirected with a `next` link."
        )

    if any(k in m for k in ("secure", "safe", "gdpr", "encrypt", "hack")):
        return (
            "CivicSign secures accounts with:\n"
            "• Encrypted passwords (bcrypt)\n"
            "• HttpOnly session cookies + rate limiting\n"
            "• Mandatory email verification for new accounts\n"
            "• UK GDPR-aligned data handling\n\n"
            "We never email your password in plain text."
        )

    if any(k in m for k in ("free", "plan", "pricing", "cost", "trial", "how many doc", "extra doc", "80p", "limit")):
        try:
            from product_assistant import _pricing_reply, _extra_document_reply

            if any(k in m for k in ("extra", "limit", "run out", "buy doc", "80p", "overage")):
                return _extra_document_reply()
            return (
                _pricing_reply()
                + "\n\nNo credit card needed to create a free account."
            )
        except ImportError:
            return (
                "After you sign in:\n"
                "• **Free** — £0, 2 documents/month\n"
                "• **Pro** — £15/month excl. VAT, 100 documents/month (1,200/year on annual billing)\n"
                "• **Business** — £79/month excl. VAT, 600 documents/month (7,200/year on annual billing)\n"
                "• **Manage PDF** — Pro, Business, and Organisation plans only\n"
                "• **Extra documents** — 80p each excl. VAT when at your monthly limit\n"
                "• Upgrade under **Settings → Subscription**\n\n"
                "No credit card needed to create a free account."
            )

    if any(k in m for k in ("register", "sign up", "create account", "new account")):
        return (
            "Creating an account:\n"
            "1. Tap **Create account** (top tabs)\n"
            "2. Enter name, email, and a strong password\n"
            "3. Verify your email with the 6-digit code\n"
            "4. You'll land on the Dashboard — tap **New Envelope** to send your first doc\n\n"
            "The whole flow takes about 2 minutes."
        )

    if any(k in m for k in ("remember", "save email")):
        return (
            "Tick **Remember my email on this device** on the sign-in form. "
            "We only store your email locally in your browser — never your password."
        )

    if ctx == "register" and any(k in m for k in ("hello", "hi", "help", "start")):
        return (
            "Ready to register? Fill in your name and email, pick a password that meets the checklist "
            "below the field, then hit **Create account**. I'll help if you get stuck on verification next."
        )

    if any(k in m for k in ("hello", "hi", "hey", "help")):
        return CONTEXT_GREETINGS.get(ctx, CONTEXT_GREETINGS["login"])

    return None


async def _openai_reply(message: str, history: List[dict], context: str) -> Optional[str]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        messages = [{"role": "system", "content": AUTH_SYSTEM_PROMPT}]
        if history:
            for h in history[-6:]:
                role = h.get("role", "user")
                if role in ("user", "assistant"):
                    messages.append({"role": role, "content": h.get("content", "")[:2000]})
        messages.append({"role": "user", "content": f"[Page: {context}] {message}"[:2000]})

        resp = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=messages,
            max_tokens=280,
            temperature=0.4,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or None
    except Exception as e:
        logger.warning(f"[auth_assistant] OpenAI fallback: {str(e)[:80]}")
        return None


async def generate_auth_reply(
    message: str,
    *,
    context: str = "login",
    history: Optional[List[dict]] = None,
) -> str:
    """Hybrid AI: OpenAI when configured, otherwise intelligent rule matching."""
    history = history or []

    ruled = rule_based_reply(message, context)
    if ruled and len(_norm(message)) < 80:
        # Short direct questions → prefer fast accurate rules
        return ruled

    llm = await _openai_reply(message, history, context)
    if llm:
        return llm

    if ruled:
        return ruled

    return (
        "I'm not sure I caught that. Try asking about:\n"
        "• Can't log in / wrong password\n"
        "• Too many attempts or rate limits\n"
        "• Email verification or resend code\n"
        "• Forgot / reset password\n"
        "• Password requirements\n"
        "• Account security or free plan\n\n"
        "Or use the quick-action buttons above my chat box."
    )