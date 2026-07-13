"""Tests for CivicSign product assistant rule replies."""
import asyncio

from assistant_format import plain_chat_text, polish_reply
from product_assistant import (
    PRODUCT_GREETING,
    generate_product_reply,
    rule_based_product_reply,
)


def test_plain_chat_strips_markdown_bold():
    assert plain_chat_text("Open **Dashboard → Prepare** now") == "Open Dashboard → Prepare now"


def test_polish_reply_no_asterisks():
    out = polish_reply("• **Signature** — draw or type")
    assert "**" not in out
    assert "Signature" in out


def test_prepare_studio_reply_is_plain():
    reply = rule_based_product_reply("How do I place signature fields?")
    assert "**" not in reply
    assert "Prepare Studio" in reply


def test_greeting_on_hello():
    reply = rule_based_product_reply("Hello")
    assert reply == PRODUCT_GREETING


def test_pricing_in_gbp():
    reply = rule_based_product_reply("What are the plan prices?")
    assert "£" in reply
    assert "Free" in reply
    assert "Pro" in reply


def test_manage_pdf_paid_plans_only():
    reply = rule_based_product_reply("What is Manage PDF?")
    assert "Manage PDF" in reply
    assert "not on Free" in reply or "not on free" in reply.lower()
    assert "2-in-1" in reply or "2 in 1" in reply


def test_uk_law_keywords():
    reply = rule_based_product_reply("Are e-signatures legal in the UK?")
    assert "Electronic Communications Act" in reply or "UK eIDAS" in reply or "SES" in reply


def test_solutions_industries():
    reply = rule_based_product_reply("Which industries do you support?")
    assert "/solutions" in reply
    assert "legal" in reply.lower() or "Legal" in reply


def test_rule_based_always_used_for_pricing_long_message():
    msg = "Hi there, I am comparing tools for my lettings agency and need to understand what are the plan prices including VAT?"
    reply = rule_based_product_reply(msg)
    assert reply is not None
    assert "£" in reply


def test_generate_product_reply_greeting_without_llm():
    reply = asyncio.run(
        generate_product_reply("Hello", history=[], system_prompt="test")
    )
    assert "copilot" in reply.lower() or "CivicSign" in reply