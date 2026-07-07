"""Starter template library — UK-friendly PDFs generated on demand."""
import uuid
import fitz

SAMPLES = [
    {
        "sample_id": "nda_mutual",
        "name": "Mutual NDA",
        "description": "Two-way confidentiality agreement for business discussions.",
        "category": "Legal",
        "signing_order": "parallel",
        "roles": [{"role_id": "role_signer", "name": "Signer", "order": 1, "color": "#14B8A6"}],
        "fields": [
            {"role_id": "role_signer", "page": 0, "type": "fullname", "x": 0.08, "y": 0.72, "w": 0.35, "h": 0.036, "required": True},
            {"role_id": "role_signer", "page": 0, "type": "signature", "x": 0.08, "y": 0.78, "w": 0.24, "h": 0.06, "required": True},
            {"role_id": "role_signer", "page": 0, "type": "date", "x": 0.55, "y": 0.78, "w": 0.16, "h": 0.032, "required": True},
        ],
        "body": (
            "MUTUAL NON-DISCLOSURE AGREEMENT\n\n"
            "This agreement is made between the parties for the purpose of evaluating a potential "
            "business relationship. Each party agrees to keep confidential all non-public information "
            "received from the other.\n\n"
            "Term: 2 years from the date of signing.\n"
            "Governing law: England and Wales.\n\n"
            "Signed:"
        ),
    },
    {
        "sample_id": "contractor_agreement",
        "name": "Contractor Agreement",
        "description": "Simple services contract for freelancers and contractors.",
        "category": "HR",
        "signing_order": "sequential",
        "roles": [{"role_id": "role_contractor", "name": "Contractor", "order": 1, "color": "#38BDF8"}],
        "fields": [
            {"role_id": "role_contractor", "page": 0, "type": "company", "x": 0.08, "y": 0.68, "w": 0.35, "h": 0.036, "required": False},
            {"role_id": "role_contractor", "page": 0, "type": "signature", "x": 0.08, "y": 0.76, "w": 0.24, "h": 0.06, "required": True},
            {"role_id": "role_contractor", "page": 0, "type": "signdate", "x": 0.55, "y": 0.76, "w": 0.16, "h": 0.032, "required": True},
        ],
        "body": (
            "INDEPENDENT CONTRACTOR AGREEMENT\n\n"
            "The Contractor agrees to perform services as described in the statement of work. "
            "Payment terms: net 14 days from invoice. Either party may terminate with 14 days' notice.\n\n"
            "IP: Work product belongs to the Client upon payment.\n"
            "Status: Contractor is not an employee for tax purposes.\n\n"
            "Contractor signature:"
        ),
    },
    {
        "sample_id": "consent_form",
        "name": "Consent Form",
        "description": "General consent with yes/no dropdown — clinics, HR, onboarding.",
        "category": "Operations",
        "signing_order": "parallel",
        "roles": [{"role_id": "role_participant", "name": "Participant", "order": 1, "color": "#F59E0B"}],
        "fields": [
            {"role_id": "role_participant", "page": 0, "type": "fullname", "x": 0.08, "y": 0.62, "w": 0.35, "h": 0.036, "required": True},
            {"role_id": "role_participant", "page": 0, "type": "dropdown", "x": 0.08, "y": 0.68, "w": 0.28, "h": 0.036,
             "required": True, "label": "Consent", "options": ["Yes, I consent", "No, I do not consent"]},
            {"role_id": "role_participant", "page": 0, "type": "signature", "x": 0.08, "y": 0.76, "w": 0.24, "h": 0.06, "required": True},
        ],
        "body": (
            "CONSENT FORM\n\n"
            "I confirm I have read and understood the information provided. I voluntarily "
            "consent to the processing described in the privacy notice.\n\n"
            "I understand I may withdraw consent at any time by contacting the organisation.\n\n"
            "Participant details:"
        ),
    },
]


def _pdf_bytes(title: str, body: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 60), title, fontsize=16, fontname="hebo", color=(0.12, 0.16, 0.18))
    rect = fitz.Rect(50, 90, 545, 720)
    page.insert_textbox(rect, body, fontsize=11, fontname="helv", color=(0.15, 0.18, 0.2))
    data = doc.tobytes()
    doc.close()
    return data


def list_samples():
    return [
        {k: v for k, v in s.items() if k != "body"}
        for s in SAMPLES
    ]


def get_sample(sample_id: str) -> dict | None:
    return next((s for s in SAMPLES if s["sample_id"] == sample_id), None)


async def clone_sample_for_user(sample_id: str, user: dict, upload_file_fn) -> dict:
    """Materialise a starter template into the user's library."""
    from datetime import datetime, timezone
    import pdf_service

    sample = get_sample(sample_id)
    if not sample:
        return None
    pdf = _pdf_bytes(sample["name"], sample["body"])
    page_count, pages = pdf_service.get_pdf_info(pdf)
    template_id = f"tpl_{uuid.uuid4().hex[:14]}"
    file_id = await upload_file_fn(
        pdf, f"{sample['sample_id']}.pdf", "template", template_id,
    )
    tpl = {
        "template_id": template_id,
        "owner_id": user["user_id"],
        "name": sample["name"],
        "description": sample["description"],
        "category": sample.get("category"),
        "signing_order": sample.get("signing_order", "sequential"),
        "roles": sample["roles"],
        "fields": sample["fields"],
        "document": {
            "original_filename": f"{sample['sample_id']}.pdf",
            "file_type": "application/pdf",
            "file_id": file_id,
            "page_count": page_count,
            "pages": pages,
        },
        "shared_with_team": False,
        "team_id": None,
        "use_count": 0,
        "sample_id": sample_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return tpl