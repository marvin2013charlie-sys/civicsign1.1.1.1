"""PDF workspace editor — upload, page ops, overlays, merge/split, save to documents."""
import io
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response as FastResponse, StreamingResponse
from pydantic import BaseModel, Field

from auth import get_current_user
from organizations import enforce_quota, release_envelope_quota
from db import (
    db,
    delete_file,
    download_document_file,
    upload_document_file,
)
import pdf_service

logger = logging.getLogger("civicsign.pdf_manager")

pdf_router = APIRouter(prefix="/api/pdf", tags=["pdf-manager"])

WORKSPACE_SCOPE = "pdf_workspace"
MAX_WORKSPACE_BYTES = 20 * 1024 * 1024
DOCX_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _now_human():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


class RectPct(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)


class TextOverlayBody(BaseModel):
    page_index: int = Field(ge=0)
    rect_pct: RectPct
    text: str = Field(max_length=4000)
    font_size: float = Field(default=12, ge=8, le=28)


class OriginPct(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class EditTextBody(BaseModel):
    page_index: int = Field(ge=0)
    rect_pct: RectPct
    new_text: str = Field(max_length=4000)
    font_size: float = Field(default=12, ge=6, le=28)
    font_name: str = Field(default="helv", max_length=32)
    old_text: Optional[str] = Field(default=None, max_length=4000)
    origin_pct: Optional[OriginPct] = None


class WhiteoutBody(BaseModel):
    page_index: int = Field(ge=0)
    rect_pct: RectPct


class PageOpBody(BaseModel):
    op: str
    page_index: Optional[int] = None
    degrees: int = 90
    after_index: int = -1
    order: Optional[List[int]] = None


class SplitBody(BaseModel):
    ranges: str = Field(min_length=1, max_length=200)


async def _get_workspace(workspace_id: str, user: dict) -> dict:
    ws = await db.pdf_workspaces.find_one(
        {"workspace_id": workspace_id, "owner_id": user["user_id"]},
        {"_id": 0},
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def _load_workspace_pdf(ws: dict) -> bytes:
    return await download_document_file(
        ws["file_id"], WORKSPACE_SCOPE, ws["workspace_id"],
    )


async def _bytes_to_pdf(raw: bytes, filename: str) -> tuple[bytes, str, int, list]:
    fname = filename or "document"
    is_docx = fname.lower().endswith((".docx", ".doc"))
    is_pdf = fname.lower().endswith(".pdf")
    if not (is_docx or is_pdf):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and Word (.docx) files are supported",
        )
    try:
        if is_docx:
            pdf_bytes = pdf_service.convert_docx_to_pdf_bytes(raw)
            out_name = fname.rsplit(".", 1)[0] + ".pdf"
        else:
            pdf_bytes = raw
            out_name = fname if fname.lower().endswith(".pdf") else fname + ".pdf"
        page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    except RuntimeError as exc:
        msg = str(exc)
        if "DOCX conversion unavailable" in msg or "conversion failed" in msg.lower():
            raise HTTPException(status_code=503, detail=msg) from exc
        raise HTTPException(status_code=400, detail="Could not process document") from exc
    except Exception as exc:
        logger.error(f"[pdf_manager] process upload: {exc}")
        raise HTTPException(status_code=400, detail="Could not process document") from exc
    return pdf_bytes, out_name, page_count, pages


async def _save_workspace_pdf(ws: dict, pdf_bytes: bytes, filename: str | None = None) -> dict:
    wid = ws["workspace_id"]
    page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    out_name = filename or ws.get("filename") or "document.pdf"
    new_file_id = await upload_document_file(
        pdf_bytes, out_name, WORKSPACE_SCOPE, wid,
    )
    old_file_id = ws.get("file_id")
    updated = {
        "file_id": new_file_id,
        "page_count": page_count,
        "pages": pages,
        "filename": out_name,
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.update_one({"workspace_id": wid}, {"$set": updated})
    if old_file_id and old_file_id != new_file_id:
        await delete_file(old_file_id)
    return {
        "workspace_id": wid,
        "filename": out_name,
        "page_count": page_count,
        "pages": pages,
        "updated_at": updated["updated_at"],
    }


def _parse_ranges(spec: str, page_count: int) -> list[tuple[int, int]]:
    try:
        return pdf_service.parse_page_ranges(spec, page_count)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@pdf_router.post("/workspace")
async def create_workspace(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_WORKSPACE_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")

    fname = file.filename or "document"
    if fname.lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only PDF and Word (.docx) files are supported")

    pdf_bytes, out_name, page_count, pages = await _bytes_to_pdf(raw, fname)
    workspace_id = f"ws_{uuid.uuid4().hex[:16]}"
    file_id = await upload_document_file(
        pdf_bytes, out_name, WORKSPACE_SCOPE, workspace_id,
    )
    doc = {
        "workspace_id": workspace_id,
        "owner_id": user["user_id"],
        "filename": out_name,
        "original_filename": fname,
        "file_id": file_id,
        "page_count": page_count,
        "pages": pages,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.insert_one(dict(doc))
    return doc


@pdf_router.get("/workspace/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
):
    return await _get_workspace(workspace_id, user)


@pdf_router.get("/workspace/{workspace_id}/page/{page_index}.png")
async def render_workspace_page(
    workspace_id: str,
    page_index: int,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page_index < 0 or page_index >= ws.get("page_count", 0):
        raise HTTPException(status_code=400, detail="Page index out of range")
    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        png = pdf_service.render_page_png(pdf_bytes, page_index)
    except Exception as exc:
        logger.error(f"[pdf_manager] render page: {exc}")
        raise HTTPException(status_code=400, detail="Could not render page") from exc
    return FastResponse(content=png, media_type="image/png")


@pdf_router.get("/workspace/{workspace_id}/page/{page_index}/text-spans")
async def get_page_text_spans(
    workspace_id: str,
    page_index: int,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page_index < 0 or page_index >= ws.get("page_count", 0):
        raise HTTPException(status_code=400, detail="Page index out of range")
    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        spans = pdf_service.extract_page_text_spans(pdf_bytes, page_index)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"[pdf_manager] text spans: {exc}")
        raise HTTPException(status_code=400, detail="Could not read page text") from exc
    return {"page_index": page_index, "spans": spans}


@pdf_router.post("/workspace/{workspace_id}/edit-text")
async def edit_page_text(
    workspace_id: str,
    body: EditTextBody,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        updated_bytes = pdf_service.replace_text_at_rect(
            pdf_bytes,
            body.page_index,
            body.rect_pct.model_dump(),
            body.new_text,
            body.font_size,
            body.font_name,
            body.old_text,
            body.origin_pct.model_dump() if body.origin_pct else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


@pdf_router.post("/workspace/{workspace_id}/text")
async def add_text_overlay(
    workspace_id: str,
    body: TextOverlayBody,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        updated_bytes = pdf_service.add_text_overlay(
            pdf_bytes,
            body.page_index,
            body.rect_pct.model_dump(),
            body.text,
            body.font_size,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


@pdf_router.post("/workspace/{workspace_id}/whiteout")
async def add_whiteout_overlay(
    workspace_id: str,
    body: WhiteoutBody,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        updated_bytes = pdf_service.add_whiteout_overlay(
            pdf_bytes, body.page_index, body.rect_pct.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


@pdf_router.post("/workspace/{workspace_id}/image")
async def add_image_overlay(
    workspace_id: str,
    page_index: int = Form(...),
    x: float = Form(...),
    y: float = Form(...),
    w: float = Form(...),
    h: float = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large — maximum 5 MB")

    rect_pct = {"x": x, "y": y, "w": w, "h": h}
    for key, val in rect_pct.items():
        if val < 0 or (key in ("w", "h") and val <= 0) or (key in ("x", "y", "w", "h") and val > 1):
            raise HTTPException(status_code=400, detail="Invalid overlay coordinates")

    pdf_bytes = await _load_workspace_pdf(ws)
    try:
        updated_bytes = pdf_service.add_image_overlay(
            pdf_bytes, page_index, rect_pct, raw,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


@pdf_router.post("/workspace/{workspace_id}/page-op")
async def workspace_page_op(
    workspace_id: str,
    body: PageOpBody,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    op = (body.op or "").strip().lower()

    try:
        if op == "rotate":
            if body.page_index is None:
                raise HTTPException(status_code=400, detail="page_index required")
            updated = pdf_service.rotate_page_pdf(
                pdf_bytes, body.page_index, body.degrees,
            )
        elif op == "delete":
            if body.page_index is None:
                raise HTTPException(status_code=400, detail="page_index required")
            updated = pdf_service.delete_page_pdf(pdf_bytes, body.page_index)
        elif op in ("insert-blank", "insert_blank"):
            updated = pdf_service.insert_blank_page_pdf(pdf_bytes, body.after_index)
        elif op == "reorder":
            if not body.order:
                raise HTTPException(status_code=400, detail="order required")
            updated = pdf_service.reorder_pages_pdf(pdf_bytes, body.order)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown op: {body.op}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return await _save_workspace_pdf(ws, updated)


@pdf_router.post("/workspace/{workspace_id}/merge")
async def merge_into_workspace(
    workspace_id: str,
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one file to append")
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    extras = []
    for f in files:
        raw = await f.read()
        if len(raw) > MAX_WORKSPACE_BYTES:
            raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")
        part_bytes, _, _, _ = await _bytes_to_pdf(raw, f.filename or "document.pdf")
        extras.append(part_bytes)
    try:
        merged = pdf_service.append_pdf_bytes(pdf_bytes, extras)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, merged)


@pdf_router.post("/workspace/{workspace_id}/split")
async def split_workspace(
    workspace_id: str,
    body: SplitBody,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    ranges = _parse_ranges(body.ranges, ws.get("page_count", 0))
    parts = pdf_service.split_pdf_to_parts(pdf_bytes, ranges)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, part in enumerate(parts, start=1):
            zf.writestr(f"part-{i}.pdf", part)
    buf.seek(0)
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{base}-split.zip"'},
    )


@pdf_router.get("/workspace/{workspace_id}/download")
async def download_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws)
    fname = ws.get("filename") or "document.pdf"
    safe = fname.replace('"', "")
    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )


@pdf_router.post("/workspace/{workspace_id}/save-to-documents")
async def save_workspace_to_documents(
    workspace_id: str,
    title: str = Form(""),
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    credits = await enforce_quota(user, count=1)
    pdf_bytes = await _load_workspace_pdf(ws)
    base = (ws.get("original_filename") or ws.get("filename") or "document").rsplit(".", 1)[0]
    env_title = (title or f"{base} (Edited)").strip()[:200]
    envelope_id = f"env_{uuid.uuid4().hex[:16]}"
    try:
        file_id = await upload_document_file(
            pdf_bytes,
            ws.get("filename") or "document.pdf",
            "envelope",
            envelope_id,
        )
        page_count = ws.get("page_count", 0)
        pages = ws.get("pages", [])
        envelope = {
            "envelope_id": envelope_id,
            "owner_id": user["user_id"],
            "owner_name": user.get("name") or user["email"],
            "title": env_title,
            "message": "",
            "status": "draft",
            "signing_order": "sequential",
            "document": {
                "original_filename": ws.get("original_filename") or ws.get("filename"),
                "file_type": "pdf",
                "file_id": file_id,
                "page_count": page_count,
                "pages": pages,
            },
            "recipients": [],
            "fields": [],
            "audit_events": [{
                "timestamp": _now_human(),
                "actor": user["email"],
                "action": "Envelope created",
                "ip": "-",
                "detail": "Saved from PDF editor",
            }],
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "sent_at": None,
            "completed_at": None,
            "expires_at": None,
            "completed_file_id": None,
            "doc_hash": None,
            "template_id": None,
        }
        await db.envelopes.insert_one(dict(envelope))
    except Exception:
        await release_envelope_quota(user, count=1, credits_consumed=credits)
        raise
    envelope.pop("_id", None)
    return envelope


@pdf_router.delete("/workspace/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
):
    ws = await _get_workspace(workspace_id, user)
    file_id = ws.get("file_id")
    await db.pdf_workspaces.delete_one({"workspace_id": workspace_id})
    if file_id:
        await delete_file(file_id)
    return {"ok": True, "workspace_id": workspace_id}