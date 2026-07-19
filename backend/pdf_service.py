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
import shutil
import tempfile
import subprocess
from datetime import datetime, timezone

import fitz  # PyMuPDF


def _now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _resolve_soffice() -> str:
    """Locate LibreOffice soffice binary (Docker, macOS app bundle, or PATH)."""
    env = (os.environ.get("LIBREOFFICE_PATH") or os.environ.get("SOFFICE_PATH") or "").strip()
    candidates = [c for c in (env, "soffice", "libreoffice") if c]
    candidates.extend([
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
    ])
    for cmd in candidates:
        if os.path.isfile(cmd) and os.access(cmd, os.X_OK):
            return cmd
        found = shutil.which(cmd)
        if found:
            return found
    raise FileNotFoundError("LibreOffice (soffice) is not installed")


def _libreoffice_convert_bytes(
    data: bytes,
    *,
    input_filename: str,
    output_ext: str,
    timeout: int = 120,
) -> bytes:
    """Convert office documents via LibreOffice headless."""
    out_ext = output_ext.lstrip(".")
    with tempfile.TemporaryDirectory() as tmp:
        in_path = os.path.join(tmp, input_filename)
        with open(in_path, "wb") as fh:
            fh.write(data)
        profile = os.path.join(tmp, "lo_profile")
        cmd = [
            _resolve_soffice(),
            "--headless", "--norestore", "--nolockcheck",
            f"-env:UserInstallation=file://{profile}",
            "--convert-to", out_ext,
            "--outdir", tmp,
            in_path,
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Office conversion unavailable — install LibreOffice on the server"
            ) from exc
        base = os.path.splitext(input_filename)[0]
        out_path = os.path.join(tmp, f"{base}.{out_ext}")
        if res.returncode != 0 or not os.path.exists(out_path):
            detail = (res.stderr or res.stdout or "").strip()[:240]
            raise RuntimeError(
                f"Conversion to {out_ext.upper()} failed{f': {detail}' if detail else ''}"
            )
        with open(out_path, "rb") as fh:
            return fh.read()


def convert_docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    """Convert a .docx (bytes) to PDF (bytes) via LibreOffice headless."""
    if not docx_bytes:
        raise ValueError("Empty Word document")
    if docx_bytes[:2] != b"PK":
        raise ValueError("Invalid Word file — upload a .docx document")
    return _libreoffice_convert_bytes(
        docx_bytes, input_filename="input.docx", output_ext="pdf",
    )


def _pdf2docx_convert(pdf_bytes: bytes) -> bytes:
    """Fallback PDF→DOCX using pdf2docx when LibreOffice is unavailable."""
    from pdf2docx import Converter

    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = os.path.join(tmp, "input.pdf")
        docx_path = os.path.join(tmp, "output.docx")
        with open(pdf_path, "wb") as fh:
            fh.write(pdf_bytes)
        cv = Converter(pdf_path)
        try:
            cv.convert(docx_path)
        finally:
            cv.close()
        with open(docx_path, "rb") as fh:
            data = fh.read()
    if not data:
        raise RuntimeError("PDF to Word conversion produced an empty file")
    return data


def convert_pdf_to_docx_bytes(pdf_bytes: bytes) -> bytes:
    """Convert PDF to editable DOCX (LibreOffice when available, else pdf2docx)."""
    if not pdf_bytes or pdf_bytes[:4] != b"%PDF":
        raise ValueError("Invalid PDF file")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if doc.needs_pass:
        doc.close()
        raise ValueError("Password-protected PDFs must be unlocked before converting to Word")
    if len(doc) < 1:
        doc.close()
        raise ValueError("PDF has no pages")
    doc.close()
    try:
        return _libreoffice_convert_bytes(
            pdf_bytes, input_filename="input.pdf", output_ext="docx",
        )
    except (FileNotFoundError, RuntimeError):
        try:
            return _pdf2docx_convert(pdf_bytes)
        except Exception as exc:
            raise RuntimeError(
                "PDF to Word conversion failed — try a text-based PDF or install LibreOffice"
            ) from exc


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


def render_page_preview(
    pdf_bytes: bytes,
    page_index: int = 0,
    dpi: int = 72,
    fmt: str = "jpeg",
    quality: int = 78,
) -> tuple[bytes, str]:
    """Render a single page to JPEG (default) or PNG for Manage PDF previews.

    JPEG at 72–96 DPI is much faster and smaller than PNG at 110 DPI, which
    previously made multi-page workspaces feel sluggish.
    """
    fmt_l = (fmt or "jpeg").strip().lower()
    if fmt_l in ("jpg", "jpeg"):
        fmt_l = "jpeg"
    elif fmt_l != "png":
        fmt_l = "jpeg"

    dpi = max(36, min(int(dpi or 72), 200))
    quality = max(40, min(int(quality or 78), 95))

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if page_index < 0 or page_index >= len(doc):
            raise IndexError(f"page_index {page_index} out of range")
        page = doc[page_index]
        # alpha=False → smaller/faster pixmap; required for JPEG encode
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        if fmt_l == "png":
            return pix.tobytes("png"), "image/png"
        return pix.tobytes("jpeg", jpg_quality=quality), "image/jpeg"
    finally:
        doc.close()


def render_page_png(pdf_bytes: bytes, page_index: int = 0, dpi: int = 110) -> bytes:
    """Backward-compatible PNG render (higher default DPI for legacy callers)."""
    data, _ctype = render_page_preview(pdf_bytes, page_index, dpi=dpi, fmt="png")
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


def _apply_seal_document_metadata(
    doc: "fitz.Document",
    envelope_meta: dict,
    doc_hash: str,
) -> None:
    """Write consistent CivicSign metadata onto the completed PDF.

    Both the stored GridFS file and the user's download share this metadata so
    verify can require matching identity fields (title, creator, keywords, etc.).
    """
    env_id = (envelope_meta.get("envelope_id") or "").strip()
    title = (envelope_meta.get("title") or "CivicSign Document").strip()[:200]
    doc.set_metadata({
        "title": title,
        "author": "CivicSign",
        "subject": f"Sealed CivicSign envelope {env_id}".strip(),
        "keywords": f"civicsign,sealed,envelope:{env_id},doc_hash:{doc_hash[:16]}",
        "creator": "CivicSign",
        "producer": "CivicSign Seal Engine",
        # creation/mod date set by PyMuPDF on save; we fingerprint structure separately
    })


def extract_seal_metadata(pdf_bytes: bytes) -> dict:
    """Extract comparable PDF metadata + page geometry for seal verification."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        meta = doc.metadata or {}
        geometry = []
        for i in range(doc.page_count):
            r = doc[i].rect
            geometry.append(f"{i}:{r.width:.2f}x{r.height:.2f}")
        return {
            "title": (meta.get("title") or "").strip(),
            "author": (meta.get("author") or "").strip(),
            "subject": (meta.get("subject") or "").strip(),
            "creator": (meta.get("creator") or "").strip(),
            "producer": (meta.get("producer") or "").strip(),
            "keywords": (meta.get("keywords") or "").strip(),
            "page_count": int(doc.page_count),
            "page_geometry": "|".join(geometry),
        }
    finally:
        doc.close()


def seal_metadata_fingerprint(meta: dict | None) -> str:
    """Stable SHA-256 over the comparable metadata fields."""
    if not meta:
        return ""
    keys = (
        "title", "author", "subject", "creator", "producer",
        "keywords", "page_count", "page_geometry",
    )
    parts = []
    for k in keys:
        v = meta.get(k, "")
        parts.append(f"{k}={v}")
    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()


def compare_seal_metadata(expected: dict | None, actual: dict | None) -> dict:
    """Field-level metadata comparison for verify UI."""
    if not expected:
        return {
            "match": None,
            "fingerprint_match": None,
            "mismatched_fields": [],
            "expected": expected,
            "actual": actual,
        }
    actual = actual or {}
    keys = (
        "title", "author", "subject", "creator", "producer",
        "keywords", "page_count", "page_geometry",
    )
    mismatched = []
    for k in keys:
        exp = expected.get(k, "")
        act = actual.get(k, "")
        # normalize page_count to int/str compare
        if k == "page_count":
            try:
                exp, act = int(exp), int(act)
            except (TypeError, ValueError):
                pass
        if exp != act:
            mismatched.append({
                "field": k,
                "expected": exp,
                "actual": act,
            })
    exp_fp = seal_metadata_fingerprint(expected)
    act_fp = seal_metadata_fingerprint(actual)
    return {
        "match": len(mismatched) == 0 and exp_fp == act_fp and bool(exp_fp),
        "fingerprint_match": exp_fp == act_fp and bool(exp_fp),
        "mismatched_fields": mismatched,
        "expected_fingerprint": exp_fp,
        "actual_fingerprint": act_fp,
        "expected": expected,
        "actual": actual,
    }


def finalize_envelope(pdf_bytes: bytes, fields, envelope_meta, audit_events):
    """Stamp fields, append Certificate of Completion, set seal metadata.

    Returns
    -------
    completed_pdf_bytes, doc_hash, signed_page_count, package_hash, seal_metadata

    doc_hash       — SHA-256 of signed page content streams (printed on the certificate).
    package_hash   — SHA-256 of the full completed PDF file (includes cert + metadata).
    seal_metadata  — Snapshot of PDF metadata + page geometry for verify comparison.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    _stamp_fields(doc, fields)
    signed_page_count = doc.page_count
    doc_hash = _page_content_hash(doc, signed_page_count)
    sig_level = envelope_meta.get("signature_level") or "basic"
    _append_certificate(
        doc, envelope_meta, audit_events, signature_level=sig_level, doc_hash=doc_hash,
    )
    _apply_seal_document_metadata(doc, envelope_meta, doc_hash)
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    package_hash = hashlib.sha256(out).hexdigest()
    seal_metadata = extract_seal_metadata(out)
    return out, doc_hash, signed_page_count, package_hash, seal_metadata


def compute_package_hash(pdf_bytes: bytes) -> str:
    """SHA-256 of the full PDF file bytes (entire package including certificate)."""
    return hashlib.sha256(pdf_bytes).hexdigest()


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
    expected_package_hash: str | None = None,
    expected_seal_metadata: dict | None = None,
    source: str = "stored",
) -> dict:
    """Compare a completed PDF against stored seals + metadata snapshot.

    Tight checks:
    - content_match: signed-page streams vs doc_hash
    - package_match: full file bytes vs package_hash (when stored)
    - metadata_match: PDF identity fields + page geometry vs seal_metadata
    - accept_as_proof: all applicable checks must pass
    """
    expected = (expected_hash or "").strip().lower()
    if len(expected) != 64:
        raise ValueError("Invalid document seal")

    expected_pkg = (expected_package_hash or "").strip().lower() or None
    if expected_pkg and len(expected_pkg) != 64:
        expected_pkg = None

    actual_meta = extract_seal_metadata(pdf_bytes)
    meta_cmp = compare_seal_metadata(expected_seal_metadata, actual_meta)

    try:
        computed = compute_signed_content_hash(pdf_bytes, signed_page_count)
    except ValueError as exc:
        return {
            "match": False,
            "accept_as_proof": False,
            "content_match": False,
            "package_match": None,
            "metadata_match": meta_cmp.get("match"),
            "metadata": meta_cmp,
            "expected_hash": expected,
            "computed_hash": None,
            "expected_package_hash": expected_pkg,
            "computed_package_hash": None,
            "source": source,
            "source_label": _source_label(source),
            "proof_verdict": "reject",
            "message": str(exc),
            "seal_migrated": False,
        }

    ref = (reference_hash or "").strip().lower() or None
    content_match = computed == expected
    seal_migrated = False

    if not content_match and ref and computed == ref:
        # Stored seal used an older serialization; signed content is intact.
        content_match = True
        seal_migrated = True
        expected = ref

    computed_pkg = compute_package_hash(pdf_bytes)
    package_match = None
    if expected_pkg:
        package_match = computed_pkg == expected_pkg

    metadata_match = meta_cmp.get("match")  # None = legacy (no stored metadata)

    # Build accept rule progressively:
    # - always need content_match
    # - package_hash if recorded
    # - metadata fingerprint if recorded
    accept_as_proof = bool(content_match)
    if expected_pkg is not None:
        accept_as_proof = accept_as_proof and bool(package_match)
    if expected_seal_metadata:
        accept_as_proof = accept_as_proof and bool(metadata_match)

    match = accept_as_proof
    source_label = _source_label(source)

    if accept_as_proof:
        if source == "uploaded":
            message = (
                "This uploaded file matches the sealed CivicSign package. "
                "Signed content, package bytes, and PDF metadata match — "
                "safe to accept as sealed proof."
            )
        else:
            message = (
                "The CivicSign stored copy matches the tamper-evident seal. "
                "Signed content, package, and metadata are intact."
            )
        if seal_migrated:
            message += " The on-file seal was refreshed to the current verification format."
        if expected_pkg is None or not expected_seal_metadata:
            message += (
                " (Legacy seal — some checks upgrade when you verify the stored copy.)"
            )
        proof_verdict = "accept"
    elif content_match and package_match is False:
        message = (
            "Signed page content matches, but the full PDF package does not. "
            "The Certificate of Completion or file packaging was altered after completion. "
            "Do not accept this file as sealed proof."
        )
        proof_verdict = "reject"
        match = False
    elif content_match and metadata_match is False:
        fields = ", ".join(f["field"] for f in meta_cmp.get("mismatched_fields") or []) or "metadata"
        message = (
            f"Signed content may look intact, but PDF metadata does not match the sealed record "
            f"(differing: {fields}). Editors often rewrite Creator/Producer/Title when re-saving. "
            "Do not accept this file as sealed proof."
        )
        proof_verdict = "reject"
        match = False
    else:
        message = (
            "The seal does not match. The document was modified after completion "
            "(for example edited in Word, Preview, or Acrobat), re-saved, or this is not "
            "the original completed PDF from CivicSign. "
            "Do not accept this file as sealed proof."
        )
        proof_verdict = "reject"

    return {
        "match": match,
        "accept_as_proof": accept_as_proof,
        "content_match": content_match,
        "package_match": package_match,
        "metadata_match": metadata_match,
        "metadata": meta_cmp,
        "expected_hash": expected,
        "computed_hash": computed,
        "expected_package_hash": expected_pkg,
        "computed_package_hash": computed_pkg if expected_pkg else None,
        "source": source,
        "source_label": source_label,
        "proof_verdict": proof_verdict,
        "message": message,
        "seal_migrated": seal_migrated,
    }


def _source_label(source: str) -> str:
    if source == "uploaded":
        return "Uploaded file (your computer or email)"
    if source == "stored":
        return "Stored copy (CivicSign server)"
    return source or "Unknown"


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


_BASE14_EDIT_FONTS = {
    "helv", "heit", "hebo", "hebi",
    "times", "tiit", "tibo", "tibi",
    "cour", "coit", "cobo", "cobi",
}


def _match_base14(font_raw: str, flags: int = 0) -> str:
    """Closest base-14 font for an embedded font, preserving bold/italic so
    replaced text keeps the original look. Passes through already-mapped names."""
    f = (font_raw or "").lower()
    if f in _BASE14_EDIT_FONTS:
        return f
    bold = bool(flags & 2 ** 4) or any(
        k in f for k in ("bold", "black", "heavy", "semibold", "demibold")
    )
    italic = bool(flags & 2 ** 1) or "italic" in f or "oblique" in f
    base = _pdf_font_name(font_raw)
    if base == "times":
        return "tibi" if (bold and italic) else "tibo" if bold else "tiit" if italic else "times"
    if base == "cour":
        return "cobi" if (bold and italic) else "cobo" if bold else "coit" if italic else "cour"
    return "hebi" if (bold and italic) else "hebo" if bold else "heit" if italic else "helv"


def _span_color_rgb(span: dict) -> tuple[float, float, float]:
    """Convert PyMuPDF span colour (0xRRGGBB int) to normalised RGB."""
    raw = span.get("color")
    if raw is None:
        return (0.06, 0.09, 0.16)
    try:
        c = int(raw)
    except (TypeError, ValueError):
        return (0.06, 0.09, 0.16)
    return (
        ((c >> 16) & 255) / 255.0,
        ((c >> 8) & 255) / 255.0,
        (c & 255) / 255.0,
    )


def _rgb_css(rgb: tuple[float, float, float]) -> str:
    r, g, b = rgb
    return f"rgb({round(r * 255)},{round(g * 255)},{round(b * 255)})"


def _merge_same_row_spans(lines: list) -> list:
    """Merge horizontally adjacent spans on one visual line (avoids stacked edit boxes)."""
    if len(lines) < 2:
        return lines
    merged: list[dict] = []
    for line in lines:
        entry = dict(line)
        if merged:
            prev = merged[-1]
            pr = prev["rect_pct"]
            lr = entry["rect_pct"]
            same_row = abs(pr["y"] - lr["y"]) < max(pr["h"], lr["h"]) * 0.55
            gap = lr["x"] - (pr["x"] + pr["w"])
            if same_row and gap < 0.04:
                prev["text"] = f"{prev['text']} {entry['text']}".strip()
                end_x = lr["x"] + lr["w"]
                prev["rect_pct"]["w"] = round(end_x - pr["x"], 5)
                prev["rect_pct"]["h"] = round(max(pr["h"], lr["h"]), 5)
                prev["rect_pct"]["y"] = round(min(pr["y"], lr["y"]), 5)
                continue
        merged.append(entry)
    for i, entry in enumerate(merged):
        entry["id"] = f"ln{i}"
    return merged


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
            font_flags = 0
            text_color = (0.06, 0.09, 0.16)
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
                    font_flags = int(span.get("flags") or 0)
                    text_color = _span_color_rgb(span)
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
                "font_name": _match_base14(font_raw, font_flags),
                "font_family": _pdf_font_family(font_raw),
                "text_color": [round(c, 4) for c in text_color],
                "text_color_css": _rgb_css(text_color),
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

    lines_out = _merge_same_row_spans(lines_out)
    for entry in lines_out:
        line_rect = _rect_from_pct(page, entry["rect_pct"])
        bg_color = _sample_bg_color(
            page, _text_band_rect(page, line_rect, entry["font_size"]),
        )
        entry["bg_color"] = [round(c, 4) for c in bg_color]
        entry["bg_color_css"] = _rgb_css(bg_color)

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
    """Strictly interior band of the matched text.

    MuPDF removes any glyph whose quad INTERSECTS the redaction rect, and
    char quads span the full line height. A middle band inset from every
    edge therefore intersects exactly the matched glyphs — and can never
    touch neighbouring characters on the same line or adjacent lines, so
    deleting "abcd" no longer takes "ef" with it.
    """
    inset_x = min(0.3, hit.width / 4)
    y_mid = (hit.y0 + hit.y1) / 2.0
    half = max(0.5, hit.height * 0.25)
    return fitz.Rect(
        hit.x0 + inset_x,
        y_mid - half,
        hit.x1 - inset_x,
        y_mid + half,
    )


def _pix_edge_samples(pix: "fitz.Pixmap") -> list[tuple[int, int, int]]:
    """Sample pixels from the outer rim of a pixmap (avoids glyph interiors)."""
    w, h = pix.width, pix.height
    if w < 2 or h < 2:
        return []
    pts = []
    step = max(1, w // 10)
    for x in range(0, w, step):
        pts.append(pix.pixel(x, 0))
        pts.append(pix.pixel(x, h - 1))
    step_y = max(1, h // 10)
    for y in range(0, h, step_y):
        pts.append(pix.pixel(0, y))
        pts.append(pix.pixel(w - 1, y))
    return pts


def _sample_bg_color(page: "fitz.Page", band: fitz.Rect) -> tuple[float, float, float]:
    """Match redaction fill to surrounding page pixels — not glyph ink (no white boxes)."""
    pr = page.rect
    margin = 8.0
    clips = [
        fitz.Rect(max(pr.x0, band.x0 - margin * 3), band.y0, max(pr.x0, band.x0 - 1), band.y1),
        fitz.Rect(min(pr.x1, band.x1 + 1), band.y0, min(pr.x1, band.x1 + margin * 3), band.y1),
        fitz.Rect(band.x0, max(pr.y0, band.y0 - margin * 2), band.x1, max(pr.y0, band.y0 - 1)),
        fitz.Rect(band.x0, min(pr.y1, band.y1 + 1), band.x1, min(pr.y1, band.y1 + margin * 2)),
    ]
    pts: list[tuple[int, int, int]] = []
    for clip in clips:
        if clip.width < 2 or clip.height < 2:
            continue
        try:
            pix = page.get_pixmap(dpi=180, clip=clip)
        except Exception:
            continue
        pts.extend(_pix_edge_samples(pix))
    if not pts:
        try:
            pix = page.get_pixmap(dpi=150, clip=band)
            pts = _pix_edge_samples(pix)
        except Exception:
            return (1.0, 1.0, 1.0)
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
    text_color: list[float] | tuple[float, float, float] | None = None,
) -> bytes:
    """Replace a whole text line in-place (Sejda-style) with background-matched redaction."""
    old = old_text or ""
    new = str(new_text or "")
    if old == new:
        return pdf_bytes

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    fs = max(6.0, min(28.0, float(font_size)))
    fn = _match_base14(font_name)
    if text_color and len(text_color) >= 3:
        ink = (
            max(0.0, min(1.0, float(text_color[0]))),
            max(0.0, min(1.0, float(text_color[1]))),
            max(0.0, min(1.0, float(text_color[2]))),
        )
    else:
        ink = (0.06, 0.09, 0.16)
    baseline = _baseline_point(page, rect, origin_pct, fs)

    hit = None
    for query in (old, old.strip()):
        if not query:
            continue
        hits = _search_in_line(page, query, rect)
        hit = _pick_best_hit(hits, page, origin_pct)
        if hit:
            break

    # Root fix for the "white box": paint nothing (fill=False) — the redaction
    # strips the original glyphs from the content stream and the page
    # background shows through untouched. Keep images and vector line art
    # (underlines, table borders) instead of letting apply_redactions
    # delete them, which left white gaps.
    band = _text_band_rect(page, hit, fs) if hit else _text_band_rect(page, rect, fs)
    page.add_redact_annot(band, fill=False)
    try:
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_NONE,
            graphics=fitz.PDF_REDACT_LINE_ART_NONE,
        )
    except TypeError:  # older PyMuPDF without the graphics kwarg
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    if new:
        insert_x = hit.x0 if hit else baseline.x
        # Auto-fit like Sejda: shrink slightly instead of running off the page.
        avail = page.rect.x1 - 4.0 - insert_x
        if avail > 0:
            width = fitz.get_text_length(new, fontname=fn, fontsize=fs)
            if width > avail:
                fs = max(6.0, fs * avail / width)
        page.insert_text(
            fitz.Point(insert_x, baseline.y),
            new,
            fontsize=fs,
            fontname=fn,
            color=ink,
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


# ---- Protect / unlock PDF (password & permissions) ----


def get_encryption_status(pdf_bytes: bytes) -> dict:
    """Return whether a PDF requires a password to open."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        needs_password = bool(doc.needs_pass)
        encrypted = bool(doc.is_encrypted or needs_password)
        page_count = len(doc) if not needs_password else None
        return {
            "encrypted": encrypted,
            "needs_password": needs_password,
            "page_count": page_count,
        }
    finally:
        doc.close()


def protect_pdf_bytes(
    pdf_bytes: bytes,
    *,
    user_password: str,
    owner_password: str | None = None,
    allow_print: bool = True,
    allow_copy: bool = False,
    allow_modify: bool = False,
) -> bytes:
    """Apply AES-256 password protection with optional permission restrictions."""
    if not user_password or len(user_password) < 4:
        raise ValueError("Password must be at least 4 characters")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if doc.needs_pass:
        doc.close()
        raise ValueError("PDF is already password protected — unlock it first")
    perms = fitz.PDF_PERM_ACCESSIBILITY
    if allow_print:
        perms |= fitz.PDF_PERM_PRINT | fitz.PDF_PERM_PRINT_HQ
    if allow_copy:
        perms |= fitz.PDF_PERM_COPY
    if allow_modify:
        perms |= (
            fitz.PDF_PERM_MODIFY
            | fitz.PDF_PERM_ANNOTATE
            | fitz.PDF_PERM_FORM
            | fitz.PDF_PERM_ASSEMBLE
        )
    owner = (owner_password or user_password).strip() or user_password
    out = doc.tobytes(
        encryption=fitz.PDF_ENCRYPT_AES_256,
        user_pw=user_password,
        owner_pw=owner,
        permissions=perms,
    )
    doc.close()
    return out


def unlock_pdf_bytes(pdf_bytes: bytes, password: str) -> bytes:
    """Remove password protection when the correct password is supplied."""
    if not password:
        raise ValueError("Password is required")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if not doc.is_encrypted and not doc.needs_pass:
        doc.close()
        raise ValueError("This PDF is not password protected")
    if not doc.authenticate(password):
        doc.close()
        raise ValueError("Incorrect password")
    out = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return out


# ---- Compress PDF (Sejda-style image optimisation + deflate) ----

COMPRESS_PRESETS = {
    "medium": {"quality": 65, "dpi_target": 72, "dpi_threshold": 150, "label": "Medium — smaller file, good for email"},
    "good": {"quality": 80, "dpi_target": 144, "dpi_threshold": 300, "label": "Good — balanced quality and size"},
    "best": {"quality": 95, "dpi_target": 288, "dpi_threshold": 600, "label": "Best — highest quality, larger file"},
}


def compress_pdf_bytes(
    pdf_bytes: bytes,
    *,
    preset: str = "medium",
    grayscale: bool = False,
) -> tuple[bytes, dict]:
    """Optimise embedded images and deflate streams — similar to Sejda compress."""
    import logging
    log = logging.getLogger("civicsign.pdf_service")
    key = preset if preset in COMPRESS_PRESETS else "medium"
    cfg = COMPRESS_PRESETS[key]
    original = len(pdf_bytes)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        doc.rewrite_images(
            dpi_threshold=cfg["dpi_threshold"],
            dpi_target=cfg["dpi_target"],
            quality=cfg["quality"],
            set_to_gray=grayscale,
        )
    except Exception as exc:
        log.warning("rewrite_images fallback: %s", exc)
    out = doc.tobytes(garbage=4, deflate=True, deflate_images=True, deflate_fonts=True)
    doc.close()
    compressed = len(out)
    savings = round((1 - compressed / original) * 100) if original else 0
    return out, {
        "original_bytes": original,
        "compressed_bytes": compressed,
        "savings_pct": max(0, savings),
        "preset": key,
        "grayscale": grayscale,
        "image_quality": cfg["quality"],
        "max_dpi": cfg["dpi_target"],
    }


def page_indices_from_ranges(spec: str | None, page_count: int) -> list[int]:
    """Return 0-based page indices; 'all' or empty means every page."""
    if not spec or spec.strip().lower() in ("all", "*", ""):
        return list(range(page_count))
    ranges = parse_page_ranges(spec, page_count)
    indices: list[int] = []
    for start, end in ranges:
        indices.extend(range(start, end + 1))
    return sorted(set(indices))


def _watermark_font(font_name: str) -> str:
    f = (font_name or "").lower()
    if "times" in f or "serif" in f:
        return "times"
    if "cour" in f or "mono" in f:
        return "cour"
    return "helv"


def _watermark_text_point(page: "fitz.Page", text: str, font_name: str, font_size: float,
                          position: str, x_pct: float, y_pct: float) -> fitz.Point:
    pr = page.rect
    tw = fitz.get_text_length(text, fontname=font_name, fontsize=font_size)
    if position == "center":
        return fitz.Point(pr.x0 + (pr.width - tw) / 2, pr.y0 + pr.height / 2)
    return fitz.Point(pr.x0 + x_pct * pr.width, pr.y0 + y_pct * pr.height)


def _watermark_image_rect(
    page: "fitz.Page",
    pix_width: int,
    pix_height: int,
    scale: float,
    position: str,
    x_pct: float,
    y_pct: float,
) -> fitz.Rect:
    pr = page.rect
    w = pr.width * scale
    h = w * (pix_height / pix_width) if pix_width else w * 0.35
    if position == "center":
        x0 = pr.x0 + (pr.width - w) / 2
        y0 = pr.y0 + (pr.height - h) / 2
    else:
        x0 = pr.x0 + x_pct * pr.width - w / 2
        y0 = pr.y0 + y_pct * pr.height - h / 2
    return fitz.Rect(x0, y0, x0 + w, y0 + h)


def _rotate_watermark_pixmap(pix: fitz.Pixmap, degrees: int) -> fitz.Pixmap:
    """Rotate a watermark image by any angle using an intermediate page render."""
    degrees = int(degrees) % 360
    if degrees == 0:
        return pix
    w, h = pix.width, pix.height
    src = fitz.open()
    try:
        page = src.new_page(width=w, height=h)
        page.insert_image(page.rect, pixmap=pix, keep_proportion=True)
        mat = fitz.Matrix(1).prerotate(degrees)
        return page.get_pixmap(matrix=mat, alpha=pix.alpha)
    finally:
        src.close()


def _watermark_image_pixmap(image_bytes: bytes, opacity: float, rotation: int) -> fitz.Pixmap:
    """Build a semi-transparent pixmap for an on-page image watermark."""
    pix = fitz.Pixmap(image_bytes)
    rot = int(rotation) % 360
    if rot:
        pix = _rotate_watermark_pixmap(pix, rot)
    op = max(0.05, min(1.0, float(opacity)))
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    w, h = pix.width, pix.height
    n = pix.n
    samples = pix.samples
    alphas = bytearray(w * h)
    alpha_idx = n - 1
    for i in range(w * h):
        base = i * n
        if n >= 4:
            alphas[i] = int(samples[base + alpha_idx] * op)
        else:
            alphas[i] = int(255 * op)
    pix.set_alpha(bytes(alphas), premultiply=1)
    return pix


def watermark_pdf_bytes(
    pdf_bytes: bytes,
    *,
    kind: str = "text",
    text: str = "CONFIDENTIAL",
    font_name: str = "helv",
    font_size: float = 48,
    color: list[float] | None = None,
    opacity: float = 0.35,
    rotation: int = 45,
    position: str = "center",
    x_pct: float = 0.5,
    y_pct: float = 0.5,
    page_range: str = "all",
    image_bytes: bytes | None = None,
    image_scale: float = 0.35,
) -> bytes:
    """Apply text or image watermark to selected pages (Sejda-style)."""
    kind = (kind or "text").strip().lower()
    if kind not in ("text", "image"):
        raise ValueError("Watermark kind must be text or image")
    if kind == "image" and not image_bytes:
        raise ValueError("Image watermark requires an image file")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)
    indices = page_indices_from_ranges(page_range, page_count)
    fn = _watermark_font(font_name)
    rgb = _clamp_rgb(color or [0.55, 0.55, 0.55])
    op = max(0.05, min(1.0, float(opacity)))
    rot = int(rotation) % 360

    for idx in indices:
        if idx < 0 or idx >= page_count:
            continue
        page = doc[idx]
        if kind == "text":
            label = (text or "CONFIDENTIAL").strip() or "CONFIDENTIAL"
            pt = _watermark_text_point(page, label, fn, font_size, position, x_pct, y_pct)
            tw = fitz.get_text_length(label, fontname=fn, fontsize=font_size)
            pivot = fitz.Point(pt.x + tw / 2, pt.y)
            if rot % 90 == 0:
                page.insert_text(
                    pt,
                    label,
                    fontsize=font_size,
                    fontname=fn,
                    color=rgb,
                    rotate=rot,
                    overlay=True,
                    fill_opacity=op,
                )
            else:
                page.insert_text(
                    pt,
                    label,
                    fontsize=font_size,
                    fontname=fn,
                    color=rgb,
                    overlay=True,
                    fill_opacity=op,
                    morph=(pivot, fitz.Matrix(rot)),
                )
        else:
            wm_pix = _watermark_image_pixmap(image_bytes, op, rot)
            rect = _watermark_image_rect(
                page, wm_pix.width, wm_pix.height, image_scale, position, x_pct, y_pct,
            )
            # overlay=True: visible on certificates and other opaque pages; opacity keeps text readable.
            page.insert_image(rect, pixmap=wm_pix, keep_proportion=True, overlay=True)
            wm_pix = None

    return _save_doc(doc)


# ---- Sejda-style annotation tools (highlight, shapes, marks, links) ----

ANNOTATION_KINDS = {"highlight", "rect", "ellipse", "line", "check", "cross", "link"}


def _clamp_rgb(color) -> tuple[float, float, float]:
    try:
        r, g, b = (max(0.0, min(1.0, float(c))) for c in (color or [])[:3])
        return (r, g, b)
    except (TypeError, ValueError):
        return (0.9, 0.15, 0.15)


def add_annotation(
    pdf_bytes: bytes,
    page_index: int,
    kind: str,
    rect_pct: dict,
    color: list[float] | None = None,
    stroke_width: float = 1.5,
    end_pct: dict | None = None,
    url: str | None = None,
) -> bytes:
    """Draw a Sejda-style annotation onto the page content (flattened)."""
    kind = (kind or "").strip().lower()
    if kind not in ANNOTATION_KINDS:
        raise ValueError(f"Unknown annotation kind: {kind}")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if page_index < 0 or page_index >= len(doc):
        doc.close()
        raise ValueError("Page index out of range")
    page = doc[page_index]
    rect = _rect_from_pct(page, rect_pct)
    rgb = _clamp_rgb(color)
    sw = max(0.5, min(8.0, float(stroke_width or 1.5)))

    if kind == "highlight":
        hl = color if color else (1.0, 0.9, 0.2)
        page.draw_rect(rect, color=None, fill=_clamp_rgb(hl), fill_opacity=0.35, overlay=True)
    elif kind == "rect":
        page.draw_rect(rect, color=rgb, width=sw, overlay=True)
    elif kind == "ellipse":
        page.draw_oval(rect, color=rgb, width=sw, overlay=True)
    elif kind == "line":
        pr = page.rect
        if end_pct and "x" in end_pct and "y" in end_pct:
            p1 = fitz.Point(rect.x0, rect.y0)
            p2 = fitz.Point(
                pr.x0 + float(end_pct["x"]) * pr.width,
                pr.y0 + float(end_pct["y"]) * pr.height,
            )
        else:
            p1, p2 = fitz.Point(rect.x0, rect.y1), fitz.Point(rect.x1, rect.y1)
        page.draw_line(p1, p2, color=rgb, width=sw)
    elif kind == "check":
        # tick drawn with two strokes, proportional to the rect
        w, h = rect.width, rect.height
        p1 = fitz.Point(rect.x0 + w * 0.12, rect.y0 + h * 0.55)
        p2 = fitz.Point(rect.x0 + w * 0.4, rect.y0 + h * 0.82)
        p3 = fitz.Point(rect.x0 + w * 0.88, rect.y0 + h * 0.18)
        ink = _clamp_rgb(color if color else (0.05, 0.55, 0.25))
        lw = max(1.2, min(w, h) * 0.14)
        page.draw_line(p1, p2, color=ink, width=lw)
        page.draw_line(p2, p3, color=ink, width=lw)
    elif kind == "cross":
        pad_x, pad_y = rect.width * 0.15, rect.height * 0.15
        ink = _clamp_rgb(color if color else (0.75, 0.12, 0.12))
        lw = max(1.2, min(rect.width, rect.height) * 0.14)
        page.draw_line(
            fitz.Point(rect.x0 + pad_x, rect.y0 + pad_y),
            fitz.Point(rect.x1 - pad_x, rect.y1 - pad_y),
            color=ink, width=lw,
        )
        page.draw_line(
            fitz.Point(rect.x1 - pad_x, rect.y0 + pad_y),
            fitz.Point(rect.x0 + pad_x, rect.y1 - pad_y),
            color=ink, width=lw,
        )
    elif kind == "link":
        target = (url or "").strip()
        if not target.lower().startswith(("http://", "https://", "mailto:")):
            doc.close()
            raise ValueError("Link URL must start with http://, https:// or mailto:")
        page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": target})

    return _save_doc(doc)
