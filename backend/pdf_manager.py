"""PDF editing workspace for CIVICSIGN — lets a logged-in user upload a PDF or
Word document and apply non-destructive edits (add text/image, white-out
regions, rotate/delete/reorder pages, merge another file, split by ranges) and
finally save the result back to their Documents list or just download it.

Every operation rewrites the PDF in GridFS and updates the workspace metadata.
Coordinates are expressed as 0..1 fractions of page width/height with a
top-left origin so they survive any page rotation/resize the renderer chose.
"""
from __future__ import annotations

import io
import re
import uuid
import zipfile
import logging
from datetime import datetime, timezone
from typing import List, Optional

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from db import db, upload_file, download_file, delete_file
from auth import get_current_user
import pdf_service

logger = logging.getLogger("civicsign.pdfmgr")

router = APIRouter(prefix="/api/pdf", tags=["pdf-manager"])

ALLOWED_PDF = ("application/pdf",)
ALLOWED_DOCX = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
)
ALLOWED_IMAGES = ("image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif")
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB per upload


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _info(pdf_bytes: bytes):
    """Return (page_count, [{width,height}, ...]) for the given PDF."""
    return pdf_service.get_pdf_info(pdf_bytes)


def _to_pdf(filename: str, content_type: str, raw: bytes) -> bytes:
    """Accept a PDF or DOCX upload and return PDF bytes."""
    is_pdf = filename.lower().endswith(".pdf") or content_type == "application/pdf"
    is_docx = (
        filename.lower().endswith((".docx", ".doc"))
        or content_type in ALLOWED_DOCX
    )
    if is_pdf:
        return raw
    if is_docx:
        return pdf_service.convert_docx_to_pdf_bytes(raw)
    raise HTTPException(status_code=400, detail="Only PDF or Word (.docx) files are supported")


async def _get_workspace(workspace_id: str, user: dict) -> dict:
    ws = await db.pdf_workspaces.find_one(
        {"workspace_id": workspace_id, "owner_id": user["user_id"]}, {"_id": 0}
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def _save_workspace_pdf(workspace_id: str, pdf_bytes: bytes, filename: str) -> dict:
    """Persist new PDF bytes for a workspace, replace previous GridFS file."""
    new_id = await upload_file(pdf_bytes, filename)
    page_count, pages = _info(pdf_bytes)
    update = {
        "file_id": new_id,
        "page_count": page_count,
        "pages": pages,
        "updated_at": _now(),
    }
    # Delete the old file after we successfully wrote the new one.
    old = await db.pdf_workspaces.find_one_and_update(
        {"workspace_id": workspace_id}, {"$set": update}, return_document=False
    )
    if old and old.get("file_id"):
        try:
            await delete_file(old["file_id"])
        except Exception:  # noqa: BLE001 — non-fatal cleanup
            pass
    return update


def _public_workspace(doc: dict) -> dict:
    return {
        "workspace_id": doc["workspace_id"],
        "filename": doc.get("filename"),
        "page_count": doc.get("page_count", 0),
        "pages": doc.get("pages", []),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


# ============================================================================
# Workspace lifecycle
# ============================================================================

@router.post("/workspace")
async def create_workspace(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large — keep it under 20 MB.")
    fname = file.filename or "document"
    pdf_bytes = _to_pdf(fname, file.content_type or "", raw)
    try:
        page_count, pages = _info(pdf_bytes)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")
    workspace_id = f"ws_{uuid.uuid4().hex[:16]}"
    file_id = await upload_file(pdf_bytes, fname.rsplit(".", 1)[0] + ".pdf")
    doc = {
        "workspace_id": workspace_id,
        "owner_id": user["user_id"],
        "filename": fname,
        "file_id": file_id,
        "page_count": page_count,
        "pages": pages,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.pdf_workspaces.insert_one(doc)
    return _public_workspace(doc)


@router.get("/workspace")
async def list_workspaces(user: dict = Depends(get_current_user)):
    items = await db.pdf_workspaces.find(
        {"owner_id": user["user_id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return [_public_workspace(d) for d in items]


@router.get("/workspace/{workspace_id}")
async def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    return _public_workspace(await _get_workspace(workspace_id, user))


@router.delete("/workspace/{workspace_id}")
async def delete_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    ws = await _get_workspace(workspace_id, user)
    try:
        await delete_file(ws["file_id"])
    except Exception:  # noqa: BLE001
        pass
    await db.pdf_workspaces.delete_one({"workspace_id": workspace_id})
    return {"ok": True}


@router.get("/workspace/{workspace_id}/page/{page}.png")
async def render_page(
    workspace_id: str, page: int, dpi: int = 110,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page < 0 or page >= ws["page_count"]:
        raise HTTPException(status_code=404, detail="Page out of range")
    pdf_bytes = await download_file(ws["file_id"])
    dpi = max(60, min(220, dpi))
    png = pdf_service.render_page_png(pdf_bytes, page, dpi=dpi)
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "no-store"})


@router.get("/workspace/{workspace_id}/download")
async def download_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await download_file(ws["file_id"])
    name = (ws.get("filename") or "edited.pdf").rsplit(".", 1)[0] + "-edited.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


# ============================================================================
# Edit operations
# ============================================================================

class AddTextBody(BaseModel):
    page: int
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    text: str = Field(min_length=1, max_length=5000)
    font_size: float = Field(default=14, ge=6, le=200)
    color: str = "#0F1720"  # CSS hex, e.g. "#000000"


class RectBody(BaseModel):
    """Used by white-out (rectangle to erase) and image placement."""
    page: int
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)


class PageOp(BaseModel):
    op: str  # rotate | delete | reorder | insert-blank
    page: Optional[int] = None
    degrees: Optional[int] = None      # rotate: 90 | 180 | 270 (cumulative)
    order: Optional[List[int]] = None  # reorder: new order of page indices
    at: Optional[int] = None           # insert-blank: insert AT this index


class SplitBody(BaseModel):
    ranges: str = Field(min_length=1)


def _hex_to_rgb01(hex_color: str):
    s = (hex_color or "").lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        return (0.06, 0.09, 0.13)  # CIVICSIGN ink fallback
    try:
        return (int(s[0:2], 16) / 255.0, int(s[2:4], 16) / 255.0, int(s[4:6], 16) / 255.0)
    except ValueError:
        return (0.06, 0.09, 0.13)


@router.post("/workspace/{workspace_id}/text")
async def add_text(workspace_id: str, body: AddTextBody, user: dict = Depends(get_current_user)):
    ws = await _get_workspace(workspace_id, user)
    if body.page < 0 or body.page >= ws["page_count"]:
        raise HTTPException(status_code=400, detail="Invalid page index")
    pdf_bytes = await download_file(ws["file_id"])
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[body.page]
    pw, ph = page.rect.width, page.rect.height
    # PyMuPDF baseline is the y coord; we treat (x,y) as the TOP-LEFT of the
    # text so add the font size for a visually correct placement.
    px = body.x * pw
    py = body.y * ph + body.font_size
    page.insert_text(
        (px, py), body.text, fontsize=body.font_size,
        color=_hex_to_rgb01(body.color), fontname="helv",
    )
    out = doc.tobytes()
    doc.close()
    await _save_workspace_pdf(workspace_id, out, ws["filename"])
    return _public_workspace(await _get_workspace(workspace_id, user))


@router.post("/workspace/{workspace_id}/whiteout")
async def whiteout(workspace_id: str, body: RectBody, user: dict = Depends(get_current_user)):
    ws = await _get_workspace(workspace_id, user)
    if body.page < 0 or body.page >= ws["page_count"]:
        raise HTTPException(status_code=400, detail="Invalid page index")
    pdf_bytes = await download_file(ws["file_id"])
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[body.page]
    pw, ph = page.rect.width, page.rect.height
    rect = fitz.Rect(body.x * pw, body.y * ph, (body.x + body.w) * pw, (body.y + body.h) * ph)
    # Solid white rectangle — covers text or images underneath.
    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), width=0, overlay=True)
    out = doc.tobytes()
    doc.close()
    await _save_workspace_pdf(workspace_id, out, ws["filename"])
    return _public_workspace(await _get_workspace(workspace_id, user))


@router.post("/workspace/{workspace_id}/image")
async def add_image(
    workspace_id: str,
    page: int = Form(...),
    x: float = Form(...),
    y: float = Form(...),
    w: float = Form(...),
    h: float = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page < 0 or page >= ws["page_count"]:
        raise HTTPException(status_code=400, detail="Invalid page index")
    if (file.content_type or "") not in ALLOWED_IMAGES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WebP or GIF image")
    img_bytes = await file.read()
    if len(img_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large — keep it under 5 MB")
    pdf_bytes = await download_file(ws["file_id"])
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    p = doc[page]
    pw, ph = p.rect.width, p.rect.height
    rect = fitz.Rect(x * pw, y * ph, (x + w) * pw, (y + h) * ph)
    p.insert_image(rect, stream=img_bytes, keep_proportion=False, overlay=True)
    out = doc.tobytes()
    doc.close()
    await _save_workspace_pdf(workspace_id, out, ws["filename"])
    return _public_workspace(await _get_workspace(workspace_id, user))


@router.post("/workspace/{workspace_id}/page-op")
async def page_op(workspace_id: str, body: PageOp, user: dict = Depends(get_current_user)):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await download_file(ws["file_id"])
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    op = body.op.lower()
    try:
        if op == "rotate":
            if body.page is None or body.page < 0 or body.page >= len(doc):
                raise HTTPException(status_code=400, detail="Invalid page")
            deg = (body.degrees or 90) % 360
            current = doc[body.page].rotation
            doc[body.page].set_rotation((current + deg) % 360)
        elif op == "delete":
            if body.page is None or body.page < 0 or body.page >= len(doc):
                raise HTTPException(status_code=400, detail="Invalid page")
            if len(doc) <= 1:
                raise HTTPException(status_code=400, detail="Cannot delete the last remaining page")
            doc.delete_page(body.page)
        elif op == "reorder":
            new_order = list(body.order or [])
            if sorted(new_order) != list(range(len(doc))):
                raise HTTPException(status_code=400, detail="Invalid page order")
            doc.select(new_order)
        elif op == "insert-blank":
            at = body.at if body.at is not None else len(doc)
            at = max(0, min(at, len(doc)))
            # Match the size of the page we're inserting near, defaulting to A4.
            ref = doc[max(0, at - 1)] if len(doc) else None
            width = ref.rect.width if ref else 595
            height = ref.rect.height if ref else 842
            doc.new_page(pno=at, width=width, height=height)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown op '{body.op}'")
        out = doc.tobytes()
    finally:
        doc.close()
    await _save_workspace_pdf(workspace_id, out, ws["filename"])
    return _public_workspace(await _get_workspace(workspace_id, user))


@router.post("/workspace/{workspace_id}/merge")
async def merge_in(
    workspace_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    add_bytes = _to_pdf(file.filename or "merge", file.content_type or "", raw)

    base_bytes = await download_file(ws["file_id"])
    base = fitz.open(stream=base_bytes, filetype="pdf")
    add = fitz.open(stream=add_bytes, filetype="pdf")
    base.insert_pdf(add)
    out = base.tobytes()
    base.close()
    add.close()
    await _save_workspace_pdf(workspace_id, out, ws["filename"])
    return _public_workspace(await _get_workspace(workspace_id, user))


def _parse_ranges(ranges: str, total: int) -> List[List[int]]:
    """Parse a "1-3, 5, 7-9" string into a list of 0-indexed page-index lists."""
    out: List[List[int]] = []
    for chunk in re.split(r"[;,]", ranges):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            a, b = a.strip(), b.strip()
            if not a.isdigit() or not b.isdigit():
                raise HTTPException(status_code=400, detail=f"Bad range '{chunk}'")
            lo, hi = int(a), int(b)
        else:
            if not chunk.isdigit():
                raise HTTPException(status_code=400, detail=f"Bad page '{chunk}'")
            lo = hi = int(chunk)
        if lo < 1 or hi < 1 or lo > total or hi > total or hi < lo:
            raise HTTPException(status_code=400, detail=f"Range '{chunk}' is out of bounds (1..{total}).")
        out.append(list(range(lo - 1, hi)))
    if not out:
        raise HTTPException(status_code=400, detail="No valid ranges provided")
    return out


@router.post("/workspace/{workspace_id}/split")
async def split_workspace(
    workspace_id: str, body: SplitBody, user: dict = Depends(get_current_user)
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await download_file(ws["file_id"])
    src = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        parts = _parse_ranges(body.ranges, len(src))
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            base_name = (ws.get("filename") or "split.pdf").rsplit(".", 1)[0]
            for idx, pages in enumerate(parts, start=1):
                part = fitz.open()
                part.insert_pdf(src, from_page=pages[0], to_page=pages[-1])
                label = f"{pages[0] + 1}" if len(pages) == 1 else f"{pages[0] + 1}-{pages[-1] + 1}"
                zf.writestr(f"{base_name}-{label}.pdf", part.tobytes())
                part.close()
        zip_buf.seek(0)
    finally:
        src.close()
    fname = f"{(ws.get('filename') or 'split').rsplit('.', 1)[0]}-split.zip"
    return StreamingResponse(
        zip_buf, media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/workspace/{workspace_id}/save-to-documents")
async def save_to_documents(workspace_id: str, user: dict = Depends(get_current_user)):
    """Create a brand new draft envelope (Documents item) from the current
    workspace PDF — independent file_id so subsequent edits do not affect it."""
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await download_file(ws["file_id"])
    title_base = (ws.get("filename") or "Edited document").rsplit(".", 1)[0]
    title = f"{title_base} (Edited)"
    file_id = await upload_file(pdf_bytes, f"{title_base}-edited.pdf")
    page_count, pages = _info(pdf_bytes)
    envelope = {
        "envelope_id": f"env_{uuid.uuid4().hex[:16]}",
        "owner_id": user["user_id"],
        "owner_name": user.get("name") or user["email"],
        "title": title, "message": "", "status": "draft",
        "signing_order": "sequential",
        "document": {
            "original_filename": ws.get("filename"),
            "file_type": "pdf", "file_id": file_id,
            "page_count": page_count, "pages": pages,
        },
        "recipients": [], "fields": [],
        "audit_events": [{
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "actor": user["email"], "action": "Envelope created from PDF editor",
            "ip": "-", "detail": f"Saved from workspace {workspace_id}",
        }],
        "created_at": _now(), "updated_at": _now(),
        "sent_at": None, "completed_at": None, "expires_at": None,
        "completed_file_id": None, "doc_hash": None, "template_id": None,
    }
    await db.envelopes.insert_one(envelope)
    envelope.pop("_id", None)
    return {"envelope_id": envelope["envelope_id"], "title": title}
