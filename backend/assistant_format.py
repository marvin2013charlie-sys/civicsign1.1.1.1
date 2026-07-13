"""Normalise assistant reply text for consistent tone and formatting."""
from __future__ import annotations

import re


def plain_chat_text(text: str) -> str:
    """Remove markdown bold/italic — chat bubbles show plain readable text."""
    if not text:
        return text
    out = str(text)
    out = re.sub(r"\*\*([^*]+)\*\*", r"\1", out)
    out = re.sub(r"\*([^*]+)\*", r"\1", out)
    out = re.sub(r"`([^`]+)`", r"\1", out)
    return out


def polish_reply(text: str, *, max_chars: int = 2400) -> str:
    """Trim noise and standardise bullets/spacing before sending to the client."""
    if not text:
        return text
    out = plain_chat_text(str(text).strip())
    # Normalise bullet markers (avoid turning ** lines into bullets)
    out = re.sub(r"^[\-]\s+", "• ", out, flags=re.MULTILINE)
    out = re.sub(r"^•\s+", "• ", out, flags=re.MULTILINE)
    # Collapse excessive blank lines
    out = re.sub(r"\n{3,}", "\n\n", out)
    # Strip common LLM preamble fluff
    out = re.sub(
        r"^(?:sure[!,]?|of course[!,]?|great question[!,]?|happy to help[!,]?)\s*\n+",
        "",
        out,
        flags=re.IGNORECASE,
    )
    if len(out) > max_chars:
        out = out[: max_chars - 3].rstrip() + "..."
    return out