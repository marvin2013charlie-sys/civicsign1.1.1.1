"""
CIVICSIGN PDF engine (ported from the proven Phase-1 POC).
Handles: DOCX->PDF conversion, PDF page introspection, stamping of
signature images / text / date / checkbox fields at PERCENTAGE coordinates,
tamper-evident SHA-256 hashing, and Certificate of Completion generation.

PyMuPDF uses a TOP-LEFT coordinate origin (same as the browser / pdf.js),
so percentage->absolute mapping is direct and accurate.
"""
import os
import io
import base64
import hashlib
import tempfile
import subprocess
from datetime import datetime, timezone

import fitz  # PyMuPDF


def _now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def convert_docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    """Convert a .docx (bytes) to PDF (bytes) via LibreOffice headless."""
    with tempfile.TemporaryDirectory() as tmp:
        in_path = os.path.join(tmp, "input.docx")
        with open(in_path, "wb") as fh:
            fh.write(docx_bytes)
        profile = os.path.join(tmp, "lo_profile")
        cmd = [
            "soffice", "--headless", "--norestore", "--nolockcheck",
            f"-env:UserInstallation=file://{profile}",
            "--convert-to", "pdf", "--outdir", tmp, in_path,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        out_path = os.path.join(tmp, "input.pdf")
        if res.returncode != 0 or not os.path.exists(out_path):
            raise RuntimeError(
                f"DOCX->PDF conversion failed: rc={res.returncode} "
                f"stdout={res.stdout} stderr={res.stderr}"
            )
        with open(out_path, "rb") as fh:
            return fh.read()


def get_pdf_info(pdf_bytes: bytes):
    """Return (page_count, [{'width':w,'height':h}, ...]) in PDF points."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    dims = [{"width": round(p.rect.width, 2), "height": round(p.rect.height, 2)} for p in doc]
    n = len(doc)
    doc.close()
    return n, dims


def render_page_png(pdf_bytes: bytes, page_index: int = 0, dpi: int = 110) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[page_index]
    pix = page.get_pixmap(dpi=dpi)
    data = pix.tobytes("png")
    doc.close()
    return data


def _decode_image_value(val):
    """Accept a data URL ('data:image/png;base64,...'), raw base64, or bytes."""
    if val is None:
        return None
    if isinstance(val, (bytes, bytearray)):
        return bytes(val)
    if isinstance(val, str):
        if val.startswith("data:"):
            _, b64 = val.split(",", 1)
            return base64.b64decode(b64)
        try:
            return base64.b64decode(val)
        except Exception:
            return None
    return None


def _stamp_fields(doc: "fitz.Document", fields):
    placed = 0
    for f in fields:
        try:
            page_idx = int(f.get("page", 0))
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]
            pr = page.rect
            rp = f["rect_pct"]
            x0 = pr.x0 + float(rp["x"]) * pr.width
            y0 = pr.y0 + float(rp["y"]) * pr.height
            x1 = pr.x0 + (float(rp["x"]) + float(rp["w"])) * pr.width
            y1 = pr.y0 + (float(rp["y"]) + float(rp["h"])) * pr.height
            rect = fitz.Rect(x0, y0, x1, y1)
            ftype = f.get("type")
            val = f.get("value")
            if ftype in ("signature", "initials", "image"):
                img = _decode_image_value(val)
                if img:
                    page.insert_image(rect, stream=img, keep_proportion=True, overlay=True)
                    placed += 1
            elif ftype in ("text", "date", "name", "email"):
                if val not in (None, ""):
                    fs = max(8.0, min(13.0, rect.height * 0.62))
                    page.insert_textbox(
                        rect, str(val), fontsize=fs, fontname="helv",
                        color=(0.06, 0.09, 0.16), align=0,
                    )
                    placed += 1
            elif ftype == "checkbox":
                page.draw_rect(rect, color=(0.4, 0.45, 0.5), width=0.8)
                if val in (True, "true", "True", 1, "1"):
                    page.draw_line(
                        fitz.Point(x0 + rect.width * 0.15, y0 + rect.height * 0.55),
                        fitz.Point(x0 + rect.width * 0.40, y0 + rect.height * 0.80),
                        color=(0.06, 0.40, 0.16), width=2.0,
                    )
                    page.draw_line(
                        fitz.Point(x0 + rect.width * 0.40, y0 + rect.height * 0.80),
                        fitz.Point(x0 + rect.width * 0.85, y0 + rect.height * 0.20),
                        color=(0.06, 0.40, 0.16), width=2.0,
                    )
                placed += 1
        except Exception:
            continue
    return placed


def _append_certificate(doc: "fitz.Document", envelope_meta, audit_events):
    doc_hash = hashlib.sha256(doc.tobytes()).hexdigest()
    page = doc.new_page(width=595, height=842)
    margin = 50

    # Header band
    page.draw_rect(fitz.Rect(0, 0, 595, 110), color=None, fill=(0.06, 0.09, 0.13))
    page.insert_text((margin, 52), "CIVICSIGN", fontsize=26, fontname="hebo", color=(1, 1, 1))
    page.insert_text((margin, 80), "Certificate of Completion", fontsize=13,
                     fontname="helv", color=(0.49, 0.85, 0.80))

    y = [142]

    def line(label, value, gap=22):
        page.insert_text((margin, y[0]), label, fontsize=10, fontname="hebo",
                         color=(0.30, 0.35, 0.42))
        page.insert_textbox(fitz.Rect(margin + 165, y[0] - 11, 545, y[0] + 26), str(value),
                            fontsize=10, fontname="helv", color=(0.06, 0.09, 0.16))
        y[0] += gap

    line("Envelope ID:", envelope_meta.get("envelope_id", ""))
    line("Document:", envelope_meta.get("title", ""))
    line("Status:", envelope_meta.get("status", "Completed"))
    line("Completed:", _now_str())
    line("Document Hash (SHA-256):", doc_hash, gap=34)

    page.insert_text((margin, y[0]), "AUDIT TRAIL", fontsize=12, fontname="hebo",
                     color=(0.06, 0.09, 0.16))
    y[0] += 8
    page.draw_line(fitz.Point(margin, y[0]), fitz.Point(545, y[0]),
                   color=(0.80, 0.83, 0.88), width=1)
    y[0] += 18

    for ev in audit_events:
        txt = f"{ev.get('timestamp','')}   |   {ev.get('actor','')}   |   {ev.get('action','')}   |   IP {ev.get('ip','-')}"
        page.insert_textbox(fitz.Rect(margin, y[0] - 10, 545, y[0] + 18), txt,
                            fontsize=9, fontname="helv", color=(0.20, 0.24, 0.30))
        y[0] += 18
        if ev.get("detail"):
            page.insert_textbox(fitz.Rect(margin + 14, y[0] - 10, 545, y[0] + 16),
                                str(ev["detail"]), fontsize=8, fontname="helv",
                                color=(0.45, 0.50, 0.56))
            y[0] += 15
        if y[0] > 770:
            page = doc.new_page(width=595, height=842)
            y[0] = 60

    y[0] += 16
    if y[0] < 740:
        page.insert_textbox(
            fitz.Rect(margin, y[0], 545, y[0] + 70),
            "This certificate is a tamper-evident record of the electronic signature "
            "transaction described above, generated in accordance with the U.S. ESIGN Act "
            "and EU eIDAS principles of intent, consent, attribution, and record retention. "
            "Any modification to the document after completion will invalidate the hash above.",
            fontsize=8, fontname="helv", color=(0.45, 0.50, 0.56))
    return doc_hash


def finalize_envelope(pdf_bytes: bytes, fields, envelope_meta, audit_events):
    """Stamp all field values onto the PDF, append the Certificate of Completion,
    and return (completed_pdf_bytes, doc_hash)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _stamp_fields(doc, fields)
    doc_hash = _append_certificate(doc, envelope_meta, audit_events)
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out, doc_hash


def build_preview_with_fields(pdf_bytes: bytes, fields):
    """Stamp fields WITHOUT certificate (used for previews if needed)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _stamp_fields(doc, fields)
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out
