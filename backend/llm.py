"""Shared OpenAI helper for CivicSign AI features."""
import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger("civicsign.llm")


def is_configured() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY", "").strip())


async def chat_completion(
    *,
    system: str,
    user: str,
    history: list[dict] | None = None,
    max_tokens: int = 400,
    temperature: float = 0.35,
    json_mode: bool = False,
) -> Optional[str]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        messages = [{"role": "system", "content": system[:8000]}]
        for h in (history or [])[-6:]:
            role = h.get("role", "user")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": str(h.get("content", ""))[:2000]})
        messages.append({"role": "user", "content": user[:6000]})

        kwargs = {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        resp = await client.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "").strip()
        return text or None
    except Exception as e:
        logger.warning(f"[llm] OpenAI error: {str(e)[:120]}")
        return None


def parse_json_object(raw: str) -> dict | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None