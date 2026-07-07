"""
CivicSign PDF engine (ported from the proven Phase-1 POC).
Handles: DOCX->PDF conversion, PDF page introspection, stamping of
signature images / text / date / checkbox fields at PERCENTAGE coordinates,
tamper-evident SHA-256 hashing, and Certificate of Completion generation.

PyMuPDF uses a TOP-LEFT coordinate origin (same as the browser / pdf.js),
so percentage->absolute mapping is direct and accurate.
"""
import os
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
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except FileNotFoundError as exc:
            raise RuntimeError(
                "DOCX conversion unavailable — please upload a PDF or install LibreOffice"
            ) from exc
        out_path = os.path.join(tmp, "input.pdf")
        if res.returncode != 0 or not os.path.exists(out_path):
            raise RuntimeError(
                "DOCX conversion failed — please upload a PDF or try again later"
            )
        with open(out_path, "rb") as fh:
            return fh.read()


def normalize_pdf_viewbox(pdf_bytes: bytes) -> bytes:
    """Align each page crop box with its media box so pdf.js and PyMuPDF share the same origin."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    changed = False
    for page in doc:
        mb = page.mediabox
        cb = page.cropbox
        if (
            abs(cb.x0 - mb.x0) > 0.5
            or abs(cb.y0 - mb.y0) > 0.5
            or abs(cb.width - mb.width) > 0.5
            or abs(cb.height - mb.height) > 0.5
        ):
            page.set_cropbox(mb)
            changed = True
    if changed:
        out = doc.tobytes(garbage=2, deflate=True)
        doc.close()
        return out
    doc.close()
    return pdf_bytes


def find_anchor_fields(pdf_bytes: bytes) -> list[dict]:
    """Place fields on detected signature/date lines using PDF text positions."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    suggestions: list[dict] = []
    try:
        for pno, page in enumerate(doc):
            pr = page.rect
            pw, ph = pr.width, pr.height
            if pw <= 0 or ph <= 0:
                continue
            for block in page.get_text("dict").get("blocks", []):
                for line in block.get("lines", []):
                    text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
                    if not text:
                        continue
                    lower = text.lower()
                    x0, y0, x1, y1 = line["bbox"]
                    lx, ly = x0 / pw, y0 / ph
                    lw = (x1 - x0) / pw

                    is_sig_line = (
                        "signature" in lower
                        and (":" in text or "_" in text or "…" in text)
                    )
                    if is_sig_line:
                        label = "Director signature" if "director" in lower else "Signature"
                        fx = min(0.74, lx + max(lw * 0.42, 0.18))
                        fy = max(0.0, ly - 0.008)
                        suggestions.append({
                            "page": pno,
                            "type": "signature",
                            "x": round(fx, 4),
                            "y": round(fy, 4),
                            "w": 0.22,
                            "h": 0.045,
                            "label": label,
                            "required": True,
                        })
                        continue

                    if lower.startswith("date:") and "_" not in lower:
                        fx = min(0.72, lx + lw * 0.22)
                        suggestions.append({
                            "page": pno,
                            "type": "date",
                            "x": round(fx, 4),
                            "y": round(ly, 4),
                            "w": 0.14,
                            "h": 0.03,
                            "label": "Date",
                            "required": True,
                        })
                        continue

                    if "name in capitals" in lower:
                        fx = min(0.72, lx + max(lw * 0.38, 0.2))
                        suggestions.append({
                            "page": pno,
                            "type": "fullname",
                            "x": round(fx, 4),
                            "y": round(ly, 4),
                            "w": 0.28,
                            "h": 0.03,
                            "label": "Full name",
                            "required": True,
                        })
    finally:
        doc.close()
    return suggestions


def get_pdf_info(pdf_bytes: bytes):
    """Return (page_count, [{'width':w,'height':h}, ...]) in PDF points."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    dims = [{"width": round(p.rect.width, 2), "height": round(p.rect.height, 2)} for p in doc]
    n = len(doc)
    doc.close()
    return n, dims


def merge_pdf_bytes(parts: list[bytes]) -> bytes:
    """Combine multiple PDFs into one document."""
    if not parts:
        raise ValueError("No PDFs to merge")
    if len(parts) == 1:
        return parts[0]
    out = fitz.open()
    for raw in parts:
        src = fitz.open(stream=raw, filetype="pdf")
        out.insert_pdf(src)
        src.close()
    merged = out.tobytes()
    out.close()
    return merged


def extract_pdf_text(pdf_bytes: bytes, max_chars: int = 12000) -> str:
    """Extract plain text from a PDF for AI summarisation (best-effort)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts = []
    total = 0
    for page in doc:
        chunk = page.get_text("text") or ""
        chunk = " ".join(chunk.split())
        if not chunk:
            continue
        parts.append(chunk)
        total += len(chunk)
        if total >= max_chars:
            break
    doc.close()
    text = "\n".join(parts)
    return text[:max_chars]


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
            if ftype in ("signature", "initials", "image", "stamp", "attachment"):
                img = _decode_image_value(val)
                if img:
                    page.insert_image(rect, stream=img, keep_proportion=True, overlay=True)
                    placed += 1
            elif ftype in ("text", "date", "name", "email", "fullname", "company", "jobtitle", "signdate", "dropdown", "radio"):
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


def _page_content_hash(doc: "fitz.Document", end_page: int) -> str:
    """SHA-256 over signed page content streams (stable after PDF save/reopen)."""
    digest = hashlib.sha256()
    for i in range(max(0, end_page)):
        if i >= doc.page_count:
            break
        contents = doc[i].get_contents()
        if not contents:
            continue
        if isinstance(contents, int):
            contents = [contents]
        for xref in contents:
            stream = doc.xref_stream(xref)
            if stream:
                digest.update(stream)
    return digest.hexdigest()


def _append_certificate(
    doc: "fitz.Document",
    envelope_meta,
    audit_events,
    signature_level: str = "basic",
    doc_hash: str | None = None,
):
    if not doc_hash:
        doc_hash = _page_content_hash(doc, doc.page_count)
    page = doc.new_page(width=595, height=842)
    margin = 50

    # Header band
    page.draw_rect(fitz.Rect(0, 0, 595, 110), color=None, fill=(0.06, 0.09, 0.13))
    page.insert_text((margin, 52), "CivicSign", fontsize=26, fontname="hebo", color=(1, 1, 1))
    page.insert_text((margin, 80), "Certificate of Completion", fontsize=13,
                     fontname="helv", color=(0.49, 0.85, 0.80))

    y = [142]

    def line(label, value, gap=22):
        page.insert_text((margin, y[0]), label, fontsize=10, fontname="hebo",
                         color=(0.30, 0.35, 0.42))
        page.insert_textbox(fitz.Rect(margin + 165, y[0] - 11, 545, y[0] + 26), str(value),
                            fontsize=10, fontname="helv", color=(0.06, 0.09, 0.16))
        y[0] += gap

    from signature_levels import LEVEL_LABELS, certificate_footer

    line("Envelope ID:", envelope_meta.get("envelope_id", ""))
    line("Document:", envelope_meta.get("title", ""))
    line("Status:", envelope_meta.get("status", "Completed"))
    line("Signature level:", LEVEL_LABELS.get(signature_level, LEVEL_LABELS["basic"]))
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
            fitz.Rect(margin, y[0], 545, y[0] + 90),
            certificate_footer(signature_level),
            fontsize=8, fontname="helv", color=(0.45, 0.50, 0.56))
    return doc_hash


def finalize_envelope(pdf_bytes: bytes, fields, envelope_meta, audit_events):
    """Stamp all field values onto the PDF, append the Certificate of Completion,
    and return (completed_pdf_bytes, doc_hash, signed_page_count)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _stamp_fields(doc, fields)
    signed_page_count = doc.page_count
    doc_hash = _page_content_hash(doc, signed_page_count)
    sig_level = envelope_meta.get("signature_level") or "basic"
    _append_certificate(
        doc, envelope_meta, audit_events, signature_level=sig_level, doc_hash=doc_hash,
    )
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out, doc_hash, signed_page_count


def normalize_uploaded_pdf_bytes(raw: bytes) -> bytes:
    """Strip email-client or download wrappers before %PDF so PyMuPDF can open the file."""
    if not raw:
        return raw
    pdf_at = raw.find(b"%PDF", 0, min(len(raw), 16384))
    if pdf_at > 0:
        return raw[pdf_at:]
    return raw


def _certificate_start_page(doc: "fitz.Document", signed_page_count: int | None = None) -> int:
    """Index of the first Certificate of Completion page."""
    if signed_page_count is not None and 0 < signed_page_count <= doc.page_count:
        return signed_page_count
    for i in range(doc.page_count):
        text = doc[i].get_text()
        if "Certificate of Completion" in text or "Document Hash (SHA-256):" in text:
            return i
    raise ValueError("This PDF does not contain a CivicSign Certificate of Completion")


def compute_signed_content_hash(
    pdf_bytes: bytes,
    signed_page_count: int | None = None,
) -> str:
    """SHA-256 of signed page content streams (certificate pages excluded)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        end_page = _certificate_start_page(doc, signed_page_count)
        return _page_content_hash(doc, end_page)
    finally:
        doc.close()


def compute_reference_hash(
    pdf_bytes: bytes,
    fields,
    signed_page_count: int | None = None,
) -> str:
    """Recompute the seal from the original PDF and collected field values."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        _stamp_fields(doc, fields)
        end = signed_page_count if signed_page_count is not None else doc.page_count
        return _page_content_hash(doc, min(end, doc.page_count))
    finally:
        doc.close()


def verify_completed_pdf_seal(
    pdf_bytes: bytes,
    expected_hash: str,
    signed_page_count: int | None = None,
    reference_hash: str | None = None,
) -> dict:
    """Compare a completed PDF's signed content against the stored doc_hash."""
    expected = (expected_hash or "").strip().lower()
    if len(expected) != 64:
        raise ValueError("Invalid document seal")
    try:
        computed = compute_signed_content_hash(pdf_bytes, signed_page_count)
    except ValueError as exc:
        return {
            "match": False,
            "expected_hash": expected,
            "computed_hash": None,
            "message": str(exc),
        }

    ref = (reference_hash or "").strip().lower() or None
    match = computed == expected
    seal_migrated = False

    if not match and ref and computed == ref:
        # Stored seal used an older serialization; signed content is intact.
        match = True
        seal_migrated = True
        expected = ref

    if match:
        message = (
            "The signed document content matches the tamper-evident seal. "
            "No changes were detected since completion."
        )
        if seal_migrated:
            message += " The on-file seal was refreshed to the current verification format."
    else:
        message = (
            "The seal does not match. The signed pages were modified after completion "
            "(for example edited in Word, Preview, or Acrobat), re-saved, or this is not "
            "the original completed PDF from CivicSign."
        )
    return {
        "match": match,
        "expected_hash": expected,
        "computed_hash": computed,
        "message": message,
        "seal_migrated": seal_migrated,
    }


def _rect_from_pct(page: "fitz.Page", rect_pct: dict) -> fitz.Rect:
    pr = page.rect
    x0 = pr.x0 + float(rect_pct["x"]) * pr.width
    y0 = pr.y0 + float(rect_pct["y"]) * pr.height
    x1 = pr.x0 + (float(rect_pct["x"]) + float(rect_pct["w"])) * pr.width
    y1 = pr.y0 + (float(rect_pct["y"]) + float(rect_pct["h"])) * pr.height
    return fitz.Rect(x0, y0, x1, y1)


def _save_doc(doc: "fitz.Document") -> bytes:
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out


def rotate_page_pdf(pdf_bytes: bytes, page_index: int, degrees: int = 90) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    page.set_rotation((int(page.rotation) + int(degrees)) % 360)
    return _save_doc(doc)


def delete_page_pdf(pdf_bytes: bytes, page_index: int) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    doc.delete_page(page_index)
    return _save_doc(doc)


def insert_blank_page_pdf(pdf_bytes: bytes, after_index: int = -1) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if len(doc):
        ref = doc[min(max(after_index, 0), len(doc) - 1)]
        width, height = ref.rect.width, ref.rect.height
    else:
        width, height = 595.0, 842.0
    insert_at = len(doc) if after_index < 0 else min(after_index + 1, len(doc))
    doc.new_page(insert_at, width=width, height=height)
    return _save_doc(doc)


def reorder_pages_pdf(pdf_bytes: bytes, order: list[int]) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if sorted(order) != list(range(len(doc))):
        doc.close()
        raise ValueError("Invalid page order")
    doc.select(order)
    return _save_doc(doc)


def append_pdf_bytes(base: bytes, extra_parts: list[bytes]) -> bytes:
    if not extra_parts:
        return base
    return merge_pdf_bytes([base, *extra_parts])


def _pdf_font_name(font: str) -> str:
    """Map PDF font names to PyMuPDF base fonts."""
    f = (font or "").lower()
    if "times" in f or "serif" in f:
        return "times"
    if "cour" in f or "mono" in f:
        return "cour"
    return "helv"


def _pdf_font_family(font: str) -> str:
    base = _pdf_font_name(font)
    if base == "times":
        return "Times New Roman, Times, serif"
    if base == "cour":
        return "Courier New, Courier, monospace"
    return "Helvetica, Arial, sans-serif"


def extract_page_text_spans(pdf_bytes: bytes, page_index: int) -> list:
    """Return editable text lines (Sejda-style) with percentage bounding boxes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    pr = page.rect
    pw, ph = pr.width, pr.height
    if pw <= 0 or ph <= 0:
        doc.close()
        return []

    lines_out = []
    idx = 0
    block_data = page.get_text("dict")
    for block in block_data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            parts = []
            x0 = y0 = x1 = y1 = None
            origin_x = origin_y = None
            font_size = 12.0
            font_raw = "helv"
            for span in line.get("spans", []):
                text = span.get("text") or ""
                if not text:
                    continue
                bbox = span.get("bbox")
                if not bbox or len(bbox) < 4:
                    continue
                sx0, sy0, sx1, sy1 = bbox
                if sx1 <= sx0 or sy1 <= sy0:
                    continue
                parts.append(text)
                if x0 is None:
                    x0, y0, x1, y1 = sx0, sy0, sx1, sy1
                    font_size = float(span.get("size", 12))
                    font_raw = span.get("font") or "helv"
                    origin = span.get("origin")
                    if origin and len(origin) >= 2:
                        origin_x, origin_y = float(origin[0]), float(origin[1])
                else:
                    x0 = min(x0, sx0)
                    y0 = min(y0, sy0)
                    x1 = max(x1, sx1)
                    y1 = max(y1, sy1)

            merged = "".join(parts).strip()
            if not merged or x0 is None:
                continue

            if origin_x is None:
                origin_x, origin_y = x0, y1

            lines_out.append({
                "id": f"ln{idx}",
                "text": merged,
                "font_size": round(font_size, 1),
                "font_name": _pdf_font_name(font_raw),
                "font_family": _pdf_font_family(font_raw),
                "rect_pct": {
                    "x": round(max(0.0, (x0 - pr.x0) / pw), 5),
                    "y": round(max(0.0, (y0 - pr.y0) / ph), 5),
                    "w": round(min(1.0, max(0.01, (x1 - x0) / pw)), 5),
                    "h": round(min(1.0, max(0.01, (y1 - y0) / ph)), 5),
                },
                "origin_pct": {
                    "x": round(max(0.0, (origin_x - pr.x0) / pw), 5),
                    "y": round(max(0.0, (origin_y - pr.y0) / ph), 5),
                },
            })
            idx += 1
    doc.close()
    return lines_out


def _tight_redact_rect(
    page: "fitz.Page",
    rect: fitz.Rect,
    pad_y: float = 0.8,
    pad_left: float = 0.8,
    pad_right: float = 0.8,
) -> fitz.Rect:
    """Clip redaction — minimal left pad on search hits so prior chars are not clipped."""
    pr = page.rect
    return fitz.Rect(
        max(pr.x0, rect.x0 - pad_left),
        max(pr.y0, rect.y0 - pad_y),
        min(pr.x1, rect.x1 + pad_right),
        min(pr.y1, rect.y1 + pad_y),
    )


def _diff_edit_parts(old_text: str, new_text: str) -> tuple[str, str, str]:
    """Return (unchanged_prefix, removed_middle, added_middle) between two strings."""
    old_text = old_text or ""
    new_text = new_text or ""
    if old_text == new_text:
        return old_text, "", ""

    prefix_len = 0
    lim = min(len(old_text), len(new_text))
    while prefix_len < lim and old_text[prefix_len] == new_text[prefix_len]:
        prefix_len += 1

    old_tail = old_text[prefix_len:]
    new_tail = new_text[prefix_len:]
    suffix_len = 0
    lim2 = min(len(old_tail), len(new_tail))
    while suffix_len < lim2 and old_tail[-(suffix_len + 1)] == new_tail[-(suffix_len + 1)]:
        suffix_len += 1

    removed = old_tail[:-suffix_len] if suffix_len else old_tail
    added = new_tail[:-suffix_len] if suffix_len else new_tail
    return old_text[:prefix_len], removed, added


def _search_in_line(page: "fitz.Page", query: str, clip: fitz.Rect) -> list:
    if not query:
        return []
    hits = page.search_for(query, clip=clip)
    if hits:
        return hits
    stripped = query.strip()
    if stripped and stripped != query:
        return page.search_for(stripped, clip=clip) or []
    return []


def _pick_best_hit(
    hits: list,
    page: "fitz.Page",
    origin_pct: dict | None,
) -> fitz.Rect | None:
    if not hits:
        return None
    if len(hits) == 1:
        return hits[0]
    if origin_pct and "x" in origin_pct and "y" in origin_pct:
        pr = page.rect
        ox = pr.x0 + float(origin_pct["x"]) * pr.width
        oy = pr.y0 + float(origin_pct["y"]) * pr.height
        return min(hits, key=lambda h: (h.x0 - ox) ** 2 + (h.y1 - oy) ** 2)
    return hits[0]


def _baseline_point(
    page: "fitz.Page",
    rect: fitz.Rect,
    origin_pct: dict | None,
    font_size: float,
) -> fitz.Point:
    if origin_pct and "x" in origin_pct and "y" in origin_pct:
        pr = page.rect
        return fitz.Point(
            pr.x0 + float(origin_pct["x"]) * pr.width,
            pr.y0 + float(origin_pct["y"]) * pr.height,
        )
    fs = max(6.0, min(28.0, float(font_size)))
    return fitz.Point(rect.x0, rect.y1 - fs * 0.28)


def _text_width(text: str, fontname: str, fontsize: float) -> float:
    if not text:
        return 0.0
    return float(fitz.get_text_length(text, fontname=fontname, fontsize=fontsize))


def _text_band_rect(page: "fitz.Page", hit: fitz.Rect, fontsize: float) -> fitz.Rect:
    """Redact only the glyph band — avoids tall boxes on the saved page."""
    fs = max(6.0, min(28.0, float(fontsize)))
    y1 = hit.y1 - fs * 0.05
    y0 = y1 - fs * 1.05
    pr = page.rect
    return fitz.Rect(
        max(pr.x0, hit.x0 - 0.1),
        max(pr.y0, y0),
        min(pr.x1, hit.x1 + 0.25),
        min(pr.y1, y1 + fs * 0.08),
    )


def _sample_bg_color(page: "fitz.Page", band: fitz.Rect) -> tuple[float, float, float]:
    """Match redaction fill to the page background so no white boxes appear."""
    pad = 6.0
    clip = fitz.Rect(
        max(page.rect.x0, band.x0 - pad),
        max(page.rect.y0, band.y0 - pad * 2),
        min(page.rect.x1, band.x1 + pad),
        min(page.rect.y1, band.y1 + pad * 2),
    )
    try:
        pix = page.get_pixmap(dpi=200, clip=clip)
    except Exception:
        return (1.0, 1.0, 1.0)
    if pix.width < 3 or pix.height < 3:
        return (1.0, 1.0, 1.0)

    pts = []
    w, h = pix.width, pix.height
    rows = (0, 1, h - 2, h - 1)
    step = max(1, w // 8)
    for y in rows:
        y = min(max(0, y), h - 1)
        for x in range(0, w, step):
            pts.append(pix.pixel(x, y))
    if not pts:
        return (1.0, 1.0, 1.0)
    n = len(pts)
    return (
        sum(p[0] for p in pts) / (255 * n),
        sum(p[1] for p in pts) / (255 * n),
        sum(p[2] for p in pts) / (255 * n),
    )


def _queue_redact(
    page: "fitz.Page",
    hit: fitz.Rect,
    fontsize: float,
    pending: list[tuple[fitz.Rect, tuple[float, float, float]]],
) -> None:
    band = _text_band_rect(page, hit, fontsize)
    pending.append((band, _sample_bg_color(page, band)))


def _flush_redactions(
    page: "fitz.Page",
    pending: list[tuple[fitz.Rect, tuple[float, float, float]]],
) -> None:
    if not pending:
        return
    for band, fill in pending:
        page.add_redact_annot(band, fill=fill)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    pending.clear()


def _suffix_search_clip(page: "fitz.Page", line_rect: fitz.Rect) -> fitz.Rect:
    pr = page.rect
    return fitz.Rect(
        line_rect.x0,
        max(pr.y0, line_rect.y0 - 2),
        pr.x1,
        min(pr.y1, line_rect.y1 + 2),
    )


def _find_suffix_hit(
    page: "fitz.Page",
    suffix: str,
    line_rect: fitz.Rect,
    origin_pct: dict | None,
) -> fitz.Rect | None:
    if not suffix:
        return None
    clip = _suffix_search_clip(page, line_rect)
    hits = _search_in_line(page, suffix, clip)
    return _pick_best_hit(hits, page, origin_pct)


def replace_text_at_rect(
    pdf_bytes: bytes,
    page_index: int,
    rect_pct: dict,
    new_text: str,
    font_size: float = 12,
    font_name: str = "helv",
    old_text: str | None = None,
    origin_pct: dict | None = None,
) -> bytes:
    """Redact only changed glyphs, insert replacements, and shift trailing text."""
    old = old_text or ""
    new = str(new_text)
    if old == new:
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    fs = max(6.0, min(28.0, float(font_size)))
    fn = _pdf_font_name(font_name)
    baseline = _baseline_point(page, rect, origin_pct, fs)

    prefix, removed, added = _diff_edit_parts(old, new)
    unchanged_suffix = old[len(prefix) + len(removed):]
    redact_hit = None
    insert_x = baseline.x

    if prefix:
        prefix_hits = _search_in_line(page, prefix, rect)
        prefix_hit = _pick_best_hit(prefix_hits, page, origin_pct)
        if prefix_hit:
            insert_x = prefix_hit.x1 + 0.5
    if removed:
        hits = _search_in_line(page, removed, rect)
        redact_hit = _pick_best_hit(hits, page, origin_pct)
        if not redact_hit and old.strip():
            full_hits = _search_in_line(page, old.strip(), rect)
            redact_hit = _pick_best_hit(full_hits, page, origin_pct)
        if redact_hit:
            insert_x = redact_hit.x0
        elif not prefix:
            insert_x = rect.x0

    suffix_x = insert_x + _text_width(added, fn, fs)
    suffix_hit = _find_suffix_hit(page, unchanged_suffix, rect, origin_pct)
    suffix_moves = (
        suffix_hit is not None
        and unchanged_suffix
        and abs(suffix_hit.x0 - suffix_x) >= 1.0
    )

    pending_redacts: list[tuple[fitz.Rect, tuple[float, float, float]]] = []

    if suffix_moves:
        _queue_redact(page, suffix_hit, fs, pending_redacts)

    if removed:
        if redact_hit:
            _queue_redact(page, redact_hit, fs, pending_redacts)
        else:
            band = _text_band_rect(page, rect, fs)
            pending_redacts.append((band, _sample_bg_color(page, band)))

    _flush_redactions(page, pending_redacts)

    if added:
        page.insert_text(
            fitz.Point(insert_x, baseline.y),
            added,
            fontsize=fs,
            fontname=fn,
            color=(0.06, 0.09, 0.16),
        )

    if suffix_moves:
        page.insert_text(
            fitz.Point(suffix_x, baseline.y),
            unchanged_suffix,
            fontsize=fs,
            fontname=fn,
            color=(0.06, 0.09, 0.16),
        )
    return _save_doc(doc)


def add_text_overlay(
    pdf_bytes: bytes,
    page_index: int,
    rect_pct: dict,
    text: str,
    font_size: float = 12,
) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    fs = max(8.0, min(28.0, float(font_size)))
    baseline_y = rect.y0 + fs * 0.85
    page.insert_text(
        fitz.Point(rect.x0, baseline_y),
        str(text or ""),
        fontsize=fs,
        fontname="helv",
        color=(0.06, 0.09, 0.16),
    )
    return _save_doc(doc)


def add_whiteout_overlay(pdf_bytes: bytes, page_index: int, rect_pct: dict) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
    return _save_doc(doc)


def add_image_overlay(pdf_bytes: bytes, page_index: int, rect_pct: dict, image_bytes: bytes) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    page.insert_image(rect, stream=image_bytes, keep_proportion=True, overlay=True)
    return _save_doc(doc)


def extract_page_range_pdf(pdf_bytes: bytes, start: int, end: int) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if start < 0 or end >= len(doc) or start > end:
        doc.close()
        raise ValueError("Invalid page range")
    out = fitz.open()
    out.insert_pdf(doc, from_page=start, to_page=end)
    doc.close()
    data = out.tobytes(garbage=4, deflate=True)
    out.close()
    return data


def split_pdf_to_parts(pdf_bytes: bytes, ranges: list[tuple[int, int]]) -> list[bytes]:
    return [extract_page_range_pdf(pdf_bytes, start, end) for start, end in ranges]


def parse_page_ranges(spec: str, page_count: int) -> list[tuple[int, int]]:
    """Parse '1-2, 3' (1-indexed inclusive) into 0-indexed (start, end) tuples."""
    spec = (spec or "").strip()
    if not spec:
        raise ValueError("Ranges required")
    parts = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            start = int(a.strip())
            end = int(b.strip())
        else:
            start = end = int(chunk)
        if start < 1 or end < 1 or start > page_count or end > page_count or start > end:
            raise ValueError(f"Invalid range: {chunk}")
        parts.append((start - 1, end - 1))
    if not parts:
        raise ValueError("Ranges required")
    return parts
