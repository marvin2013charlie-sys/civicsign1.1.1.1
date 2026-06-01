"""SendGrid email delivery for CIVICSIGN. Gracefully skips when no API key is
configured so the app remains fully functional via shareable signing links."""
import os
import base64
import logging

logger = logging.getLogger("civicsign.email")

BRAND = "#1FB8A6"
INK = "#0F1720"


def _enabled():
    return bool(os.environ.get("SENDGRID_API_KEY") and os.environ.get("SENDER_EMAIL"))


def _shell(title: str, body_html: str, cta_label: str = None, cta_url: str = None):
    cta = ""
    if cta_label and cta_url:
        cta = (
            f'<a href="{cta_url}" style="display:inline-block;background:{BRAND};'
            f'color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;'
            f'font-weight:600;font-family:Arial,sans-serif;font-size:15px;margin-top:8px">'
            f'{cta_label}</a>'
        )
    return f"""
    <div style="background:#F7F3EC;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E3D7C6;border-radius:16px;overflow:hidden">
        <div style="background:{INK};padding:20px 28px">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">CIVIC<span style="color:{BRAND}">SIGN</span></span>
        </div>
        <div style="padding:28px">
          <h1 style="color:{INK};font-size:20px;margin:0 0 12px">{title}</h1>
          <div style="color:#3a4650;font-size:15px;line-height:1.6">{body_html}</div>
          <div style="margin-top:20px">{cta}</div>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #eee;color:#8a9299;font-size:12px">
          Sent securely via CIVICSIGN \u2022 Electronic signatures with a tamper-evident audit trail.
        </div>
      </div>
    </div>"""


def _send(to_email, subject, html, attachment_bytes=None, attachment_name="document.pdf"):
    if not _enabled():
        logger.info(f"[EMAIL skipped] to={to_email} subject={subject!r} (SendGrid not configured)")
        return "skipped"
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import (
            Mail, Attachment, FileContent, FileName, FileType, Disposition,
        )
        message = Mail(
            from_email=os.environ["SENDER_EMAIL"],
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        if attachment_bytes:
            encoded = base64.b64encode(attachment_bytes).decode()
            message.attachment = Attachment(
                FileContent(encoded), FileName(attachment_name),
                FileType("application/pdf"), Disposition("attachment"),
            )
        sg = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
        resp = sg.send(message)
        ok = resp.status_code in (200, 201, 202)
        logger.info(f"[EMAIL sent] to={to_email} status={resp.status_code}")
        return "sent" if ok else f"error_{resp.status_code}"
    except Exception as e:  # never block the signing flow on email errors
        logger.error(f"[EMAIL error] to={to_email} err={e}")
        return "error"


def send_signing_invite(to_email, signer_name, sender_name, doc_title, sign_url, message=None):
    extra = f'<p style="background:#F2ECE3;border-left:3px solid {BRAND};padding:10px 14px;border-radius:6px;margin:14px 0">\u201c{message}\u201d</p>' if message else ""
    body = (
        f"<p>Hi {signer_name or 'there'},</p>"
        f"<p><b>{sender_name}</b> has requested your signature on "
        f"<b>{doc_title}</b>.</p>{extra}"
        f"<p>Click the button below to review and sign. No account required.</p>"
    )
    html = _shell("You have a document to sign", body, "Review & Sign", sign_url)
    return _send(to_email, f"{sender_name} requests your signature: {doc_title}", html)


def send_completion(to_email, doc_title, completed_pdf_bytes=None):
    body = (
        f"<p>Good news \u2014 <b>{doc_title}</b> has been completed by all parties.</p>"
        f"<p>The fully executed document is attached, along with a Certificate of "
        f"Completion containing the full audit trail.</p>"
    )
    html = _shell("Your document is complete", body)
    fname = (doc_title or "document").replace(" ", "_") + "-completed.pdf"
    return _send(to_email, f"Completed: {doc_title}", html,
                 attachment_bytes=completed_pdf_bytes, attachment_name=fname)


def send_declined(to_email, doc_title, decliner, reason=None):
    body = (
        f"<p><b>{decliner}</b> has declined to sign <b>{doc_title}</b>.</p>"
        + (f"<p>Reason: {reason}</p>" if reason else "")
    )
    html = _shell("A signer declined", body)
    return _send(to_email, f"Declined: {doc_title}", html)
