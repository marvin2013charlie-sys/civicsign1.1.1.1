"""CIVICSIGN starter (sample) templates.

Generates ready-to-use legal/HR document PDFs with pre-placed signature blocks
and seeds them as shared "system" templates that every user can preview and use.

Field coordinates are expressed as TOP-LEFT-origin fractions (0..1) of the page,
matching the rest of the CIVICSIGN field model and the PyMuPDF stamping engine.
"""
import io
import uuid
import logging
import textwrap
from datetime import datetime, timezone

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from db import db, upload_file
import pdf_service

logger = logging.getLogger("civicsign.samples")

PAGE_W, PAGE_H = letter  # (612.0, 792.0)
MARGIN = 72
ROLE_COLORS = ["#1FB8A6", "#FF7A5C", "#0284C7"]

INK = (0.06, 0.09, 0.13)
GREY = (0.30, 0.35, 0.42)
BODY = (0.20, 0.24, 0.30)
LINE = (0.62, 0.66, 0.72)
TEAL = (0.12, 0.72, 0.65)


# --------------------------------------------------------------------------
# Template definitions
# --------------------------------------------------------------------------
SAMPLE_DEFS = [
    {
        "key": "nda",
        "name": "Mutual Non-Disclosure Agreement",
        "description": "Two-party mutual NDA to protect confidential information shared during discussions.",
        "roles": ["Disclosing Party", "Receiving Party"],
        "signing_order": "parallel",
        "intro": "This Mutual Non-Disclosure Agreement (the \u201cAgreement\u201d) is entered into as of [DATE] by and between the parties identified below (each a \u201cParty\u201d).",
        "clauses": [
            ("1. Confidential Information", "\u201cConfidential Information\u201d means any non-public information disclosed by one Party to the other, whether oral, written or electronic, including business plans, customer data, financials, designs and trade secrets."),
            ("2. Obligations", "Each Party agrees to keep the other Party's Confidential Information strictly confidential, to use it solely for the purpose of the parties' business relationship, and not to disclose it to any third party without prior written consent."),
            ("3. Term", "The obligations of confidentiality under this Agreement shall survive for a period of three (3) years from the date of disclosure."),
            ("4. Return of Materials", "Upon written request, each Party shall promptly return or destroy all Confidential Information of the other Party in its possession."),
            ("5. Governing Law", "This Agreement shall be governed by and construed in accordance with the laws of the applicable jurisdiction, without regard to conflict-of-law principles."),
        ],
    },
    {
        "key": "ip_deed",
        "name": "IP Assignment Deed",
        "description": "Assigns ownership of intellectual property from an assignor to an assignee.",
        "roles": ["Assignor", "Assignee"],
        "signing_order": "parallel",
        "intro": "This Intellectual Property Assignment Deed (the \u201cDeed\u201d) is made on [DATE] between the Assignor and the Assignee identified below.",
        "clauses": [
            ("1. Assignment", "The Assignor hereby irrevocably assigns to the Assignee all right, title and interest in and to the intellectual property described in Schedule A, including all patents, copyrights, trademarks, designs and trade secrets therein."),
            ("2. Moral Rights", "To the extent permitted by law, the Assignor waives all moral rights in the assigned intellectual property."),
            ("3. Further Assurance", "The Assignor shall, at the Assignee's reasonable request and expense, execute such documents and do such acts as may be necessary to perfect the Assignee's title."),
            ("4. Warranties", "The Assignor warrants that it is the sole legal and beneficial owner of the intellectual property and that it is free from encumbrances."),
            ("5. Governing Law", "This Deed shall be governed by the laws of the applicable jurisdiction."),
        ],
    },
    {
        "key": "shareholder",
        "name": "Shareholders' Agreement",
        "description": "Sets out the rights and obligations between a company and a shareholder.",
        "roles": ["Company", "Shareholder"],
        "signing_order": "parallel",
        "intro": "This Shareholders' Agreement (the \u201cAgreement\u201d) is entered into as of [DATE] between the Company and the Shareholder named below.",
        "clauses": [
            ("1. Shares", "The Shareholder holds [NUMBER] shares representing [PERCENT]% of the issued share capital of the Company, subject to the terms of this Agreement."),
            ("2. Transfer Restrictions", "No Shareholder shall transfer any shares except in accordance with the pre-emption and right-of-first-refusal provisions set out herein."),
            ("3. Governance", "The Board shall manage the business of the Company. Certain reserved matters require the approval of holders of at least [PERCENT]% of the shares."),
            ("4. Dividends", "Dividends shall be declared and paid in proportion to each Shareholder's shareholding, subject to the Company's distributable profits."),
            ("5. Confidentiality & Governing Law", "The Shareholder shall keep Company information confidential. This Agreement is governed by the laws of the applicable jurisdiction."),
        ],
    },
    {
        "key": "offer",
        "name": "Employment Offer Letter",
        "description": "A single-signer offer of employment, ready to send to a candidate.",
        "roles": ["Candidate"],
        "signing_order": "sequential",
        "intro": "Dear [CANDIDATE NAME],\n\nWe are delighted to offer you the position of [JOB TITLE] at [COMPANY NAME]. We were impressed by your background and believe you will be a great addition to our team.",
        "clauses": [
            ("1. Position & Start Date", "Your role will be [JOB TITLE], reporting to [MANAGER]. Your anticipated start date is [START DATE]."),
            ("2. Compensation", "Your annual base salary will be [SALARY], paid in accordance with the company's standard payroll schedule, plus benefits as described in the employee handbook."),
            ("3. Employment Terms", "This offer is contingent upon successful completion of background checks and your eligibility to work. Employment is at-will unless otherwise stated."),
            ("4. Acceptance", "To accept this offer, please sign and date below. We look forward to welcoming you aboard!"),
        ],
    },
    {
        "key": "onboarding",
        "name": "Employee Onboarding Letter",
        "description": "A single-signer onboarding acknowledgement for new hires.",
        "roles": ["Employee"],
        "signing_order": "sequential",
        "intro": "Welcome to [COMPANY NAME]! We are thrilled to have you join us as [JOB TITLE]. This letter confirms a few important onboarding items as you get started.",
        "clauses": [
            ("1. First Day", "Please arrive on [START DATE] at [TIME] at [LOCATION]. Your manager [MANAGER] will greet you and walk you through your first-day schedule."),
            ("2. Policies & Handbook", "By signing below you acknowledge that you have received and agree to comply with the company's policies, code of conduct and employee handbook."),
            ("3. Equipment & Access", "Your equipment and system access will be provisioned on or before your start date. Please safeguard all company assets and credentials."),
            ("4. Acknowledgement", "Please sign and date below to confirm your onboarding details. We can't wait to see what we'll accomplish together!"),
        ],
    },
]


def _wrap(text, width=96):
    lines = []
    for raw in text.split("\n"):
        if not raw.strip():
            lines.append("")
            continue
        lines.extend(textwrap.wrap(raw, width=width) or [""])
    return lines


def _draw_signature_block(c, role_name, sig_y):
    """Draw a signature/date/name block whose signature line sits at sig_y
    (points from the bottom). Returns the list of field dicts (top-left fractions)."""
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(*GREY)
    c.drawString(MARGIN, sig_y + 30, f"Signed by: {role_name}")

    # Signature line
    sig_left, sig_w = MARGIN, 210
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(1)
    c.line(sig_left, sig_y, sig_left + sig_w, sig_y)
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(*GREY)
    c.drawString(sig_left, sig_y - 12, "Signature")

    # Date line
    date_left, date_w = 360, 150
    c.line(date_left, sig_y, date_left + date_w, sig_y)
    c.drawString(date_left, sig_y - 12, "Date")

    # Printed name line (below)
    name_y = sig_y - 48
    c.line(sig_left, name_y, sig_left + sig_w, name_y)
    c.drawString(sig_left, name_y - 12, "Printed name")

    def frac(x, y_bottom, w, h):
        # convert (points-from-bottom bottom edge) -> top-left fractions
        top_from_top = PAGE_H - (y_bottom + h)
        return {
            "x": round(x / PAGE_W, 4),
            "y": round(top_from_top / PAGE_H, 4),
            "w": round(w / PAGE_W, 4),
            "h": round(h / PAGE_H, 4),
        }

    fields = [
        {"type": "signature", "label": "Signature", **frac(sig_left, sig_y + 2, sig_w, 34)},
        {"type": "date", "label": "Date", **frac(date_left, sig_y + 2, date_w, 22)},
        {"type": "text", "label": "Printed name", **frac(sig_left, name_y + 2, sig_w, 20)},
    ]
    return fields


def generate_sample_pdf(d):
    """Render a sample template PDF and return (pdf_bytes, per_role_fields).

    per_role_fields is a list aligned with d['roles']: per_role_fields[i] is the
    list of field dicts for role i.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)

    # Header band
    c.setFillColorRGB(*INK)
    c.rect(0, PAGE_H - 86, PAGE_W, 86, stroke=0, fill=1)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(MARGIN, PAGE_H - 50, "CIVICSIGN")
    c.setFillColorRGB(*TEAL)
    c.setFont("Helvetica", 12)
    c.drawString(MARGIN, PAGE_H - 70, d["name"])

    # Title
    y = PAGE_H - 120
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN, y, d["name"])
    y -= 24

    # Intro
    c.setFont("Helvetica", 9.5)
    c.setFillColorRGB(*BODY)
    for line in _wrap(d["intro"]):
        c.drawString(MARGIN, y, line)
        y -= 13
    y -= 10

    # Clauses
    for heading, text in d["clauses"]:
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColorRGB(*INK)
        c.drawString(MARGIN, y, heading)
        y -= 15
        c.setFont("Helvetica", 9.5)
        c.setFillColorRGB(*BODY)
        for line in _wrap(text):
            c.drawString(MARGIN, y, line)
            y -= 12.5
        y -= 8

    # Signature blocks at fixed positions near the bottom
    roles = d["roles"]
    if len(roles) == 1:
        anchors = [200]
    else:
        anchors = [250, 130]
    per_role_fields = []
    for i, role_name in enumerate(roles):
        fields = _draw_signature_block(c, role_name, anchors[i])
        per_role_fields.append(fields)

    # Footer
    c.setFont("Helvetica-Oblique", 7.5)
    c.setFillColorRGB(*GREY)
    c.drawString(MARGIN, 44,
                 "Sample template provided by CIVICSIGN. Replace [BRACKETED] placeholders before sending.")

    c.showPage()
    c.save()
    return buf.getvalue(), per_role_fields


def _now():
    return datetime.now(timezone.utc).isoformat()


async def seed_sample_templates():
    """Idempotently create the shared sample templates (owner_id='system')."""
    for d in SAMPLE_DEFS:
        tid = f"sample_{d['key']}"
        existing = await db.templates.find_one({"template_id": tid})
        if existing:
            continue
        try:
            pdf_bytes, per_role_fields = generate_sample_pdf(d)
            page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
            file_id = await upload_file(pdf_bytes, f"{d['key']}.pdf")

            roles, fields = [], []
            for i, role_name in enumerate(d["roles"]):
                role_id = f"role_{uuid.uuid4().hex[:10]}"
                roles.append({
                    "role_id": role_id, "name": role_name, "order": i + 1,
                    "color": ROLE_COLORS[i % len(ROLE_COLORS)],
                })
                for f in per_role_fields[i]:
                    fields.append({
                        "field_id": f"fld_{uuid.uuid4().hex[:10]}",
                        "role_id": role_id, "page": 0,
                        "type": f["type"], "x": f["x"], "y": f["y"],
                        "w": f["w"], "h": f["h"], "required": True,
                        "label": f.get("label"),
                    })

            await db.templates.insert_one({
                "template_id": tid, "owner_id": "system", "is_sample": True,
                "name": d["name"], "description": d["description"],
                "document": {"original_filename": f"{d['name']}.pdf", "file_type": "pdf",
                             "file_id": file_id, "page_count": page_count, "pages": pages},
                "signing_order": d["signing_order"],
                "roles": roles, "fields": fields, "use_count": 0,
                "created_at": _now(), "updated_at": _now(),
            })
            logger.info(f"Seeded sample template: {tid}")
        except Exception as e:
            logger.error(f"Failed to seed sample template {tid}: {e}")
