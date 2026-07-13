"""Shared product knowledge and rule-based replies for CivicSign assistants."""
from __future__ import annotations

import re
from typing import Optional

from brand import CONTACT_EMAIL

try:
    from billing import EXTRA_DOCUMENT_PRICE_GBP, PRO_MONTHLY_GBP, BUSINESS_MONTHLY_GBP
    from tax import UK_VAT_PERCENT, tax_breakdown
except ImportError:
    EXTRA_DOCUMENT_PRICE_GBP = 0.80
    PRO_MONTHLY_GBP = 15.00
    BUSINESS_MONTHLY_GBP = 79.00
    UK_VAT_PERCENT = 20

    def tax_breakdown(amount_ex_vat: float) -> dict:
        net = round(float(amount_ex_vat), 2)
        vat = round(net * 0.20, 2)
        return {"amount_ex_vat": net, "vat_amount": vat, "amount_inc_vat": round(net + vat, 2)}

try:
    from plan_features import PLAN_MONTHLY_QUOTA
except ImportError:
    PLAN_MONTHLY_QUOTA = {"free": 2, "pro": 100, "business": 600}


def _extra_doc_label() -> str:
    if EXTRA_DOCUMENT_PRICE_GBP < 1:
        pence = int(round(EXTRA_DOCUMENT_PRICE_GBP * 100))
        return f"{pence}p"
    if EXTRA_DOCUMENT_PRICE_GBP == int(EXTRA_DOCUMENT_PRICE_GBP):
        return f"£{int(EXTRA_DOCUMENT_PRICE_GBP)}"
    return f"£{EXTRA_DOCUMENT_PRICE_GBP:.2f}"


EXTRA_DOC_LABEL = _extra_doc_label()

PRODUCT_GREETING = (
    "Hi! I'm your CivicSign copilot — e-signatures and Manage PDF in one platform.\n\n"
    "Ask me about sending documents, Prepare Studio, plans, or UK e-signature law."
)

PRODUCT_FALLBACK = (
    "I'm not sure I caught that. Try asking about:\n"
    "• Sending a document or using Prepare Studio\n"
    "• Plans, pricing, or buying an extra document\n"
    "• Templates, bulk send, or reminders\n"
    "• UK e-signature legality (SES, AES, QES)\n"
    "• Upgrading or managing your subscription\n\n"
    f"For account-specific help, email {CONTACT_EMAIL} or use the Contact page."
)

PRODUCT_SYSTEM_FACTS = (
    f"PRICING (GBP): Free £0/forever — {PLAN_MONTHLY_QUOTA['free']} documents/month. "
    f"Pro £{int(PRO_MONTHLY_GBP)}/month — {PLAN_MONTHLY_QUOTA['pro']} documents/month "
    f"(annual: 1,200/year). "
    f"Business £{int(BUSINESS_MONTHLY_GBP)}/month — {PLAN_MONTHLY_QUOTA['business']} documents/month "
    f"(annual: {PLAN_MONTHLY_QUOTA['business'] * 12:,}/year). "
    "Manage PDF (edit, merge, split) is included on all paid plans (Pro, Business, Organisation); not on Free. "
    "(everything in Pro plus bulk send, API/webhooks, recipient authentication, priority support; self-serve). "
    "Organisation — custom multi-seat contracts (contact sales). "
    f"When a user hits their billing-period document limit on any self-serve plan, they can buy extra documents "
    f"for {EXTRA_DOC_LABEL} each via Settings → Subscription or the header Buy doc button (Free plan). "
    "Yearly billing: pay 10 months, get 12 (2 months free). "
    f"Support: {CONTACT_EMAIL} or Contact page. Always quote prices in pounds (£), never dollars. "
    "SIGNATURE TIERS BY PLAN: Free — electronic signatures with audit trail and SHA-256 seal (basic tier, ECA 2000). "
    "Pro — Simple Electronic Signatures (SES, UK eIDAS Art. 3(11)) by default, with Advanced Electronic Signatures "
    "(AES, Art. 26) selectable when sending. Business — AES by default, strengthened with optional postcode (KBA) recipient "
    "authentication; Qualified Electronic Signatures (QES, Art. 3(12)) available on request via a QTSP partner. "
    "Senders choose the level on Review & Send when their plan allows it."
)


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def _pricing_reply() -> str:
    pro_tax = tax_breakdown(PRO_MONTHLY_GBP)
    biz_tax = tax_breakdown(BUSINESS_MONTHLY_GBP)
    extra_tax = tax_breakdown(EXTRA_DOCUMENT_PRICE_GBP)
    return (
        "CivicSign plans (GBP, **excluding VAT**):\n\n"
        f"• **Free** — £0 forever, **{PLAN_MONTHLY_QUOTA['free']} documents/month**, up to 2 recipients, "
        "electronic signatures + audit trail\n"
        f"• **Pro** — **£{int(PRO_MONTHLY_GBP)}/month excl. VAT** "
        f"(**£{pro_tax['amount_inc_vat']:.2f} incl. {UK_VAT_PERCENT}% VAT**), "
        f"**{PLAN_MONTHLY_QUOTA['pro']} documents/month** (annual: **1,200/year**), "
        "Manage PDF, SES + AES signatures, templates, branding, public signing links, auto-reminders\n"
        f"• **Business** — **£{int(BUSINESS_MONTHLY_GBP)}/month excl. VAT** "
        f"(**£{biz_tax['amount_inc_vat']:.2f} incl. {UK_VAT_PERCENT}% VAT**), "
        f"**{PLAN_MONTHLY_QUOTA['business']} documents/month** (annual: **{PLAN_MONTHLY_QUOTA['business'] * 12:,}/year**), "
        "everything in Pro plus bulk send, API/webhooks, recipient postcode (KBA) auth, priority support\n"
        "• **Organisation** — custom multi-seat contracts (contact us)\n\n"
        f"At your billing-period limit? Buy extra documents for **{EXTRA_DOC_LABEL} excl. VAT** "
        f"(**£{extra_tax['amount_inc_vat']:.2f} incl. VAT** each), or upgrade under "
        "**Settings → Subscription**. Yearly plans save 2 months."
    )


def _extra_document_reply() -> str:
    extra_tax = tax_breakdown(EXTRA_DOCUMENT_PRICE_GBP)
    return (
        f"When you've used your included documents for this billing period, you can buy **extra documents for {EXTRA_DOC_LABEL} excl. VAT** "
        f"(**£{extra_tax['amount_inc_vat']:.2f} incl. {UK_VAT_PERCENT}% VAT** each, one-off, no subscription change).\n\n"
        "How to buy:\n"
        "1. **Settings → Subscription** → Buy extra document(s)\n"
        "2. On the **Free** plan, use **Buy 1 doc** in the top-right header\n"
        "3. From **Dashboard** or **Usage** when you hit the limit\n\n"
        "Credits apply immediately after Stripe checkout. They roll over until used."
    )


def _send_document_reply() -> str:
    return (
        "To send a document for signature:\n"
        "1. **Dashboard** → **New Envelope**\n"
        "2. Upload a **PDF** or **Word** file (.docx)\n"
        "3. In **Prepare Studio**, drag **Signature**, **Initials**, **Date**, **Text**, or **Checkbox** fields onto the PDF\n"
        "4. Assign each field to a **recipient** (name + email)\n"
        "5. **Review & Send** — set signing order (sequential or parallel), reminders, expiry, signature tier\n"
        "6. Hit **Send** — signers get a secure email link (no account needed)\n\n"
        "Track progress on your Dashboard. You'll get notified when everyone has signed."
    )


def _prepare_studio_reply() -> str:
    return (
        "Prepare Studio is where you place fields before sending.\n\n"
        "• Dashboard → open your envelope → Prepare\n"
        "• Drag Signature, Initials, Date, Text, or Checkbox from the left toolbar\n"
        "• Click a field to assign it to a recipient, then resize if needed\n"
        "• Optional: Suggest fields (AI) to auto-place signature areas\n"
        "• Save when done — nothing is sent until you hit Send\n\n"
        "Tip: put signatures where ink would go, with a Date field nearby."
    )


def _templates_reply() -> str:
    return (
        "Templates save your field layout and recipients for reuse:\n"
        "• **Templates** in the sidebar — browse your saved templates and the **Starter library**\n"
        "• After preparing a document, **Save as template** to reuse fields next time\n"
        "• **Public links** (Pro+) let anyone sign via a URL without you sending each time\n\n"
        "Great for contracts, onboarding packs, or forms you send repeatedly."
    )


def _bulk_send_reply() -> str:
    return (
        "Bulk send (Business plan) sends one template to many signers at once:\n"
        "1. Create or open a template with all required fields\n"
        "2. **Bulk send** → upload a CSV with recipient names/emails\n"
        "3. Review rows, then send — each person gets their own envelope\n\n"
        "Need bulk send? Upgrade to **Business** under Settings → Subscription."
    )


def _reminders_reply() -> str:
    return (
        "Automatic reminders nudge signers who haven't completed yet:\n"
        "• Set reminder frequency on **Review & Send** (e.g. every 3 days)\n"
        "• Available on all plans for envelopes you send\n"
        "• Signers receive polite email reminders until they sign or the envelope expires\n\n"
        "You can also resend manually from the envelope detail page."
    )


def _upgrade_reply() -> str:
    return (
        "To upgrade or manage billing:\n"
        "1. **Settings → Subscription**\n"
        "2. Choose **Pro** or **Business** (monthly or yearly)\n"
        "3. Complete secure **Stripe** checkout — your plan updates automatically\n\n"
        f"Free users can also buy a one-off document ({EXTRA_DOC_LABEL}) from the header or Subscription tab "
        "without upgrading. Organisation plans: contact us for a tailored quote."
    )


def _quota_reply() -> str:
    return (
        "Document limits (per billing period):\n"
        f"• Free — {PLAN_MONTHLY_QUOTA['free']} documents/month\n"
        f"• Pro — {PLAN_MONTHLY_QUOTA['pro']} documents/month or 1,200/year on annual billing\n"
        f"• Business — {PLAN_MONTHLY_QUOTA['business']} documents/month or "
        f"{PLAN_MONTHLY_QUOTA['business'] * 12:,}/year on annual billing\n"
        f"• Organisation — custom allowance\n\n"
        f"Check **Usage** in the sidebar for your count. Over the limit? Buy extras ({EXTRA_DOC_LABEL} each) "
        "or upgrade in **Settings → Subscription**."
    )


def _uk_law_reply() -> str:
    return (
        "UK e-signatures are generally legally valid when the signatory intends to authenticate the document.\n\n"
        "**Key law:** Electronic Communications Act 2000; UK eIDAS (ETSI/eIDAS Regulations 2016); "
        "Law Commission 2019 report on electronic execution.\n\n"
        "**Tiers (UK eIDAS):**\n"
        "• **SES** — simple e-sign (draw/type) — fine for most contracts\n"
        "• **AES** — advanced; uniquely linked to signatory, tamper-evident (Pro+)\n"
        "• **QES** — highest assurance; available on request for Business\n\n"
        "Some documents (e.g. certain deeds, wills) have special formalities — consult a solicitor for high-risk matters. "
        "CivicSign provides audit trails and certificates of completion to support enforceability."
    )


def _signature_tiers_reply() -> str:
    return (
        "Signature tiers on CivicSign:\n"
        "• **Free** — electronic signature + SHA-256 seal + audit trail (ECA 2000 basic tier)\n"
        "• **Pro** — **SES** by default; optionally choose **AES** on Review & Send\n"
        "• **Business** — **AES** by default; optional **postcode (KBA)** recipient authentication\n"
        "• **QES** (qualified) — on request via QTSP partner for regulated use cases\n\n"
        "Pick the tier when sending if your plan allows it. Higher tiers add stronger identity evidence."
    )


def _signer_experience_reply() -> str:
    return (
        "What your signers experience:\n"
        "1. Email with a secure **Sign now** link (no CivicSign account required)\n"
        "2. Review the document in the browser\n"
        "3. Complete assigned fields — draw, type, or upload a signature\n"
        "4. Submit — they receive a copy; you get a completion notification\n\n"
        "Business plans can require **postcode (KBA)** identity checks before signing."
    )


def _audit_trail_reply() -> str:
    return (
        "Every envelope gets a tamper-evident **audit trail** and **Certificate of Completion** when fully signed:\n"
        "• Timestamps, IP addresses, and signer actions are recorded\n"
        "• Completed PDF is sealed with SHA-256 hashing\n"
        "• Download the certificate from the envelope detail page\n\n"
        "Useful for disputes, compliance, and proving who signed when."
    )


def _api_reply() -> str:
    return (
        "API & webhooks are available on the **Business** plan (Settings → Integrations):\n"
        "• **API keys** — `X-API-Key` header; list envelopes and poll status via `/api/v1/`\n"
        "• **Webhooks** — HMAC-signed POSTs for sent, viewed, signed, completed, declined, voided\n"
        "• **Test webhook** + delivery log in Settings; works with Zapier, Make, and custom HTTPS endpoints\n\n"
        f"Email {CONTACT_EMAIL} for Salesforce/HubSpot connector help."
    )


def _branding_reply() -> str:
    return (
        "Custom branding (Pro and above):\n"
        "• **Settings → Branding** — upload logo, set brand colours\n"
        "• Signing page shows your business identity instead of generic CivicSign\n"
        "• Optional banner message for signers\n\n"
        "Free plan uses standard CivicSign signing chrome."
    )


def _cancel_reply() -> str:
    return (
        "Manage or cancel your subscription:\n"
        "• **Settings → Subscription** — view current plan and billing interval\n"
        "• Downgrades take effect at the next renewal (you keep paid features until then)\n"
        "• Refund policy is on our **Refund Policy** page — one-off document purchases are generally non-refundable "
        "once credits are applied\n\n"
        f"Billing questions? Email {CONTACT_EMAIL}."
    )


def _contact_reply() -> str:
    return (
        f"Reach CivicSign support:\n"
        f"• Email **{CONTACT_EMAIL}**\n"
        "• **Contact** page on the website (support, sales, Organisation quotes)\n"
        "• Business customers get **priority support**\n\n"
        "We typically respond within one business day."
    )


def _organisation_reply() -> str:
    return (
        "The **Organisation** plan is for teams needing:\n"
        "• Multiple seats under one contract\n"
        "• Custom document allowances and governance\n"
        "• Invoicing and dedicated support\n\n"
        f"Contact us via the **Contact** page or {CONTACT_EMAIL} for a tailored quote."
    )


def _suggest_fields_reply() -> str:
    return (
        "To auto-suggest fields in Prepare Studio:\n"
        "1. Upload your document and open **Prepare Studio**\n"
        "2. Click **Suggest fields** (sparkle icon) — AI scans for signature lines, dates, and initials\n"
        "3. Review suggestions, adjust placement, assign recipients\n"
        "4. Add or remove fields manually as needed\n\n"
        "Works best on clear PDFs with labelled signature blocks."
    )


def _sequential_parallel_reply() -> str:
    return (
        "Signing order on Review & Send:\n"
        "• **Parallel** — all recipients can sign at the same time (fastest)\n"
        "• **Sequential** — signers go in order (signer 2 only gets access after signer 1 finishes)\n\n"
        "Use sequential for approval chains (e.g. employee → manager → HR)."
    )


def _expiration_reply() -> str:
    return (
        "Envelope expiration:\n"
        "• Set an expiry date on **Review & Send**\n"
        "• After expiry, signers can no longer complete the document\n"
        "• You can void or resend from the envelope page if needed\n\n"
        "Default reminders help signers finish before expiry."
    )


def _dashboard_reply() -> str:
    return (
        "Your **Dashboard** shows all envelopes:\n"
        "• **Draft** — still preparing\n"
        "• **Sent / In progress** — waiting on signers\n"
        "• **Completed** — all signed; download the final PDF + certificate\n"
        "• **Voided / Expired** — no longer active\n\n"
        "Use **New Envelope** to start, or filter/search to find past sends."
    )


def _word_pdf_reply() -> str:
    return (
        "Supported file types:\n"
        "• **PDF** — best for Prepare Studio (fields placed on exact positions)\n"
        "• **Word (.docx)** — converted to PDF on upload; then prepare as usual\n\n"
        "Tip: export complex Word layouts to PDF first if formatting matters."
    )


def _manage_pdf_reply() -> str:
    return (
        "**Manage PDF** is included on every paid plan (Pro, Business, Organisation) — not on Free.\n\n"
        "It's the other half of our 2-in-1 platform: prepare files, then sign without leaving CivicSign.\n\n"
        "You can:\n"
        "• **Edit** text, images, annotations and pages\n"
        "• **Compress**, **watermark**, **protect** or **unlock** PDFs\n"
        "• **Merge**, **split**, and convert **Word ↔ PDF**\n"
        "• Run an **AI metadata** scan\n\n"
        "Workflow: **Manage PDF** → **Save to Documents** → open in **Prepare Studio** → send for signature.\n\n"
        "Upgrade under **Settings → Subscription** if you're on Free."
    )


def _solutions_reply() -> str:
    return (
        "CivicSign has **nine UK industry solution pages** at **/solutions**:\n\n"
        "• **Property** — real estate, construction & trades\n"
        "• **Professional** — legal, financial services, staffing agencies\n"
        "• **People & care** — HR, healthcare, education\n"
        "• **Non-profits** — charities (Gift Aid, trustees)\n\n"
        "Each page lists typical documents, compliance notes, and workflows for that sector. "
        "Pick your industry from the **Solutions** menu on the site."
    )


def _gdpr_reply() -> str:
    return (
        "CivicSign is built for UK GDPR compliance:\n"
        "• Data processed in line with our Privacy Policy\n"
        "• You control document retention; delete envelopes when no longer needed\n"
        "• Signers don't need accounts — minimal personal data collected\n"
        "• Encryption in transit (HTTPS) and secure storage\n\n"
        "See **Privacy Policy** on the site for full details."
    )


def rule_based_product_reply(message: str) -> Optional[str]:
    """Return a curated product answer when we recognise the intent."""
    m = _norm(message)

    if not m:
        return PRODUCT_GREETING

    if any(k in m for k in ("hello", "hi ", " hi", "hey", "good morning", "good afternoon")):
        if any(k in m for k in ("help", "start", "new", "how")) or len(m) < 20:
            return PRODUCT_GREETING

    if any(k in m for k in ("manage pdf", "manage-pdf", "compress pdf", "watermark", "merge pdf", "split pdf", "edit pdf", "2-in-1", "2 in 1")):
        return _manage_pdf_reply()

    if any(k in m for k in ("solution", "industries", "industry page", "/solutions")):
        return _solutions_reply()
    if "industr" in m and any(k in m for k in ("which", "what", "support", "cover", "offer", "sector")):
        return _solutions_reply()

    if any(k in m for k in ("extra doc", "extra document", "buy doc", "buy 1", "80p", "overage", "run out", "limit reached", "monthly limit")):
        if any(k in m for k in ("price", "cost", "how much", "buy", "extra", "limit", "quota", "run out")):
            return _extra_document_reply()

    if any(k in m for k in ("price", "pricing", "plan", "cost", "how much", "subscription", "tier", "free plan", "pro plan", "business plan")):
        return _pricing_reply()

    if any(k in m for k in ("quota", "how many doc", "document limit", "documents per month", "monthly doc", "usage limit")):
        return _quota_reply()

    if any(k in m for k in ("upgrade", "downgrade", "change plan", "switch plan", "subscribe", "billing", "stripe", "payment")):
        return _upgrade_reply()

    if any(k in m for k in ("cancel", "refund", "unsubscribe")):
        return _cancel_reply()

    if any(k in m for k in ("organisation", "organization", "enterprise", "multi-seat", "team contract")):
        return _organisation_reply()

    if any(k in m for k in ("bulk send", "bulk", "csv", "mass send", "many recipient")):
        return _bulk_send_reply()

    if any(k in m for k in ("template", "starter library", "reusable", "powerform", "public link")):
        return _templates_reply()

    if any(k in m for k in ("reminder", "nudge", "chase signer", "follow up")):
        return _reminders_reply()

    if any(k in m for k in ("prepare studio", "prepare", "place field", "drag field", "signature field", "add field", "initials field", "checkbox field")):
        return _prepare_studio_reply()

    if any(k in m for k in ("suggest field", "auto field", "ai field", "detect field")):
        return _suggest_fields_reply()

    if any(k in m for k in ("send doc", "send a doc", "new envelope", "how do i send", "upload", "getting started")):
        return _send_document_reply()

    if any(k in m for k in ("sequential", "parallel", "signing order", "order of signing")):
        return _sequential_parallel_reply()

    if any(k in m for k in ("expir", "void", "deadline")):
        return _expiration_reply()

    if any(k in m for k in ("signer", "recipient", "no account", "signing link", "sign now")):
        return _signer_experience_reply()

    if any(k in m for k in ("audit", "certificate", "completion", "tamper", "proof")):
        return _audit_trail_reply()

    if any(k in m for k in ("legal", "law", "valid", "enforceable", "eca", "eidas", "deed", "will")):
        return _uk_law_reply()

    if any(k in m for k in ("ses", "aes", "qes", "electronic signature tier", "advanced signature", "qualified")):
        return _signature_tiers_reply()

    if any(k in m for k in ("api", "webhook", "integrat", "developer")):
        return _api_reply()

    if any(k in m for k in ("brand", "logo", "colour", "color", "white label")):
        return _branding_reply()

    if any(k in m for k in ("dashboard", "track", "status", "envelope status")):
        return _dashboard_reply()

    if any(k in m for k in ("pdf", "word", "docx", "file type", "upload format")):
        return _word_pdf_reply()

    if any(k in m for k in ("gdpr", "privacy", "data protection", "ico")):
        return _gdpr_reply()

    if any(k in m for k in ("contact", "email you", "talk to", "help desk", "customer support", "reach support")):
        return _contact_reply()

    if any(k in m for k in ("help", "what can you", "what do you")):
        return (
            "I can help with:\n"
            "• Sending documents & **Prepare Studio**\n"
            "• **Manage PDF** (2-in-1 on paid plans)\n"
            "• Plans, quotas & buying extra documents\n"
            "• Industry solutions at **/solutions**\n"
            "• UK e-signature law & signature tiers\n"
            "• Upgrades, billing & Organisation quotes\n\n"
            "Tap a suggestion below or ask in your own words."
        )

    return None


async def generate_product_reply(
    message: str,
    *,
    history: list[dict] | None = None,
    system_prompt: str,
) -> str:
    """Hybrid reply: curated rules for known intents, then LLM, then fallback."""
    from assistant_format import polish_reply

    history = history or []
    ruled = rule_based_product_reply(message)

    if ruled:
        return polish_reply(ruled)

    from llm import chat_completion

    llm = await chat_completion(
        system=system_prompt,
        user=message,
        history=history,
        max_tokens=320,
        temperature=0.35,
    )
    if llm:
        return polish_reply(llm)

    return polish_reply(PRODUCT_FALLBACK)