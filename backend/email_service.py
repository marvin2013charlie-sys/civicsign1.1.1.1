"""Resend email delivery for CivicSign. Gracefully skips when no API key is
configured so the app remains fully functional via shareable signing links."""
import os
import logging

logger = logging.getLogger("civicsign.email")

BRAND = "#14B8A6"
INK = "#122120"


def _enabled():
    return bool(os.environ.get("RESEND_API_KEY") and os.environ.get("SENDER_EMAIL"))


def _from_address():
    sender = os.environ.get("SENDER_EMAIL", "")
    name = os.environ.get("SENDER_NAME", "").strip()
    return f"{name} <{sender}>" if name else sender


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
    <div style="background:#F8F7F2;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E1DDD1;border-radius:16px;overflow:hidden">
        <div style="background:{INK};padding:20px 28px">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">CIVIC<span style="color:{BRAND}">SIGN</span></span>
        </div>
        <div style="padding:28px">
          <h1 style="color:{INK};font-size:20px;margin:0 0 12px">{title}</h1>
          <div style="color:#3a4650;font-size:15px;line-height:1.6">{body_html}</div>
          <div style="margin-top:20px">{cta}</div>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #eee;color:#8a9299;font-size:12px">
          Sent securely via CivicSign \u2022 Electronic signatures with a tamper-evident audit trail.
        </div>
      </div>
    </div>"""


def _send(to_email, subject, html, attachment_bytes=None, attachment_name="document.pdf"):
    if not _enabled():
        logger.info(f"[EMAIL skipped] to={to_email} subject={subject!r} (Resend not configured)")
        return "skipped"
    try:
        import resend
        resend.api_key = os.environ["RESEND_API_KEY"]
        params = {
            "from": _from_address(),
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        if attachment_bytes:
            params["attachments"] = [{
                "filename": attachment_name,
                "content": list(attachment_bytes),
            }]
        result = resend.Emails.send(params)
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        logger.info(f"[EMAIL sent] to={to_email} id={email_id}")
        return "sent" if email_id else "error"
    except Exception as e:  # never block the signing flow on email errors
        logger.error(f"[EMAIL error] to={to_email} err={e}")
        return "error"


def is_configured() -> bool:
    """Whether real email delivery (Resend) is configured."""
    return _enabled()


def send_password_reset(to_email, name, reset_url):
    body = (
        f"<p>Hi {name or 'there'},</p>"
        f"<p>A password reset was requested for your CivicSign account. "
        f"Click the button below to choose a new password. This link expires in 1 hour.</p>"
        f"<p style=\"color:#8a9299;font-size:13px\">If you didn't request this, you can safely ignore this email.</p>"
    )
    html = _shell("Reset your password", body, "Reset password", reset_url)
    return _send(to_email, "Reset your CivicSign password", html)


def send_verification_code(to_email, name, code):
    body = (
        f"<p>Hi {name or 'there'},</p>"
        f"<p>Welcome to CivicSign! Use the verification code below to confirm your email "
        f"address and activate your account. This code expires in 15 minutes.</p>"
        f"<div style=\"margin:18px 0;text-align:center\">"
        f"<span style=\"display:inline-block;background:#F0EEE6;border:1px solid #E1DDD1;"
        f"border-radius:12px;padding:14px 24px;font-size:30px;font-weight:700;letter-spacing:8px;"
        f"color:{INK};font-family:Arial,sans-serif\">{code}</span></div>"
        f"<p style=\"color:#8a9299;font-size:13px\">If you didn't create a CivicSign account, "
        f"you can safely ignore this email.</p>"
    )
    html = _shell("Verify your email", body)
    return _send(to_email, f"Your CivicSign verification code: {code}", html)


def send_impersonation_otp(to_email, name, code, staff_email):
    """Consent OTP: a support member may only enter this user's account if the
    user reads this code back to them. Sent to the USER, never to staff."""
    body = (
        f"<p>Hi {name or 'there'},</p>"
        f"<p>A CivicSign support team member (<b>{staff_email}</b>) has asked to access "
        f"your account to help troubleshoot an issue. To approve this, share the "
        f"one-time code below with them. It expires in 5 minutes.</p>"
        f"<div style=\"margin:18px 0;text-align:center\">"
        f"<span style=\"display:inline-block;background:#F0EEE6;border:1px solid #E1DDD1;"
        f"border-radius:12px;padding:14px 24px;font-size:30px;font-weight:700;letter-spacing:8px;"
        f"color:{INK};font-family:Arial,sans-serif\">{code}</span></div>"
        f"<p style=\"color:#8a9299;font-size:13px\">If you did not request support, do NOT share "
        f"this code — simply ignore this email and no one will be able to access your account.</p>"
    )
    html = _shell("Approve support access", body)
    return _send(to_email, f"CivicSign support access code: {code}", html)


def send_welcome(to_email, name):
    body = (
        f"<p>Hi {name or 'there'},</p>"
        f"<p>Your email is verified and your CivicSign account is ready. \U0001F389</p>"
        f"<p>You can now prepare documents, add signature fields, and send them for "
        f"legally binding e-signatures \u2014 each with a tamper-evident audit trail.</p>"
        f"<ul style=\"color:#3a4650;font-size:14px;line-height:1.7\">"
        f"<li>Upload a PDF or Word document</li>"
        f"<li>Drag-and-drop signature, date and text fields</li>"
        f"<li>Send a secure signing link \u2014 no account required for signers</li>"
        f"</ul>"
    )
    html = _shell("Welcome to CivicSign", body)
    return _send(to_email, "Welcome to CivicSign \U0001F389", html)


def send_signing_invite(to_email, signer_name, sender_name, doc_title, sign_url, message=None):
    extra = f'<p style="background:#F0EEE6;border-left:3px solid {BRAND};padding:10px 14px;border-radius:6px;margin:14px 0">\u201c{message}\u201d</p>' if message else ""
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
