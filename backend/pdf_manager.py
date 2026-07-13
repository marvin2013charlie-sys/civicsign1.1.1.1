"""PDF workspace editor — upload, page ops, overlays, merge/split, save to documents."""
import io
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response as FastResponse, StreamingResponse
from pydantic import BaseModel, Field

from auth import get_current_user
from document_access import assert_can_access_document_bytes

from plan_features import require_feature
from db import (
    db,
    delete_file,
    download_document_file,
    upload_document_file,
)
import ai_metadata_check
import pdf_service

logger = logging.getLogger("civicsign.pdf_manager")

pdf_router = APIRouter(prefix="/api/pdf", tags=["pdf-manager"])

def _pdf_user(user: dict = Depends(get_current_user)) -> dict:
    require_feature(user, "manage_pdf")
    return user

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


def _attachment_disposition(filename: str) -> str:
    """RFC 5987 Content-Disposition safe for unicode filenames (latin-1 header limit)."""
    name = (filename or "download").replace("\r", "").replace("\n", "").strip() or "download"
    ascii_name = name.encode("ascii", "ignore").decode("ascii")
    ascii_name = ascii_name.replace('"', "'").replace("\\", "_").strip() or "download"
    encoded = quote(name, safe="")
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}'


MANAGE_PDF_TOOLS = frozenset({
    "edit", "compress", "watermark", "protect", "unlock", "merge", "word_to_pdf",
    "split", "pdf_to_word", "ai_metadata",
})

_MANAGE_PDF_AUDIT = {
    "edit": "Saved from PDF editor",
    "compress": "Saved from PDF compress",
    "watermark": "Saved from PDF watermark",
    "protect": "Saved from PDF protect",
    "unlock": "Saved from PDF unlock",
    "merge": "Saved from PDF merge",
    "word_to_pdf": "Saved from Word to PDF",
    "split": "Saved from PDF split",
    "pdf_to_word": "Saved from PDF to Word",
    "ai_metadata": "Saved AI metadata scan report",
}


async def _persist_manage_pdf_envelope(
    user: dict,
    *,
    file_bytes: bytes,
    filename: str,
    title: str,
    manage_pdf_tool: str,
    original_filename: str | None,
    file_type: str,
    page_count: int,
    pages: list,
) -> dict:
    tool = (manage_pdf_tool or "edit").lower().strip()
    if tool not in MANAGE_PDF_TOOLS:
        raise HTTPException(status_code=400, detail="Invalid Manage PDF tool")
    safe_name = (filename or "document").strip() or "document"
    orig = (original_filename or safe_name).strip() or safe_name
    env_title = (title or safe_name.rsplit(".", 1)[0]).strip()[:200]
    envelope_id = f"env_{uuid.uuid4().hex[:16]}"
    file_id = await upload_document_file(file_bytes, safe_name, "envelope", envelope_id)
    envelope = {
        "envelope_id": envelope_id,
        "owner_id": user["user_id"],
        "owner_name": user.get("name") or user["email"],
        "title": env_title,
        "message": "",
        "status": "draft",
        "signing_order": "sequential",
        "source": "manage_pdf",
        "manage_pdf_tool": tool,
        "document": {
            "original_filename": orig,
            "file_type": file_type,
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
            "detail": _MANAGE_PDF_AUDIT.get(tool, "Saved from Manage PDF"),
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
    envelope.pop("_id", None)
    return envelope


async def _create_draft_envelope_from_pdf(
    user: dict,
    pdf_bytes: bytes,
    filename: str,
    title: str,
    *,
    manage_pdf_tool: str,
    original_filename: str | None = None,
) -> dict:
    if not pdf_bytes or pdf_bytes[:4] != b"%PDF":
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    safe_name = (filename or "document.pdf").strip() or "document.pdf"
    if not safe_name.lower().endswith(".pdf"):
        safe_name = f"{safe_name}.pdf"
    page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    return await _persist_manage_pdf_envelope(
        user,
        file_bytes=pdf_bytes,
        filename=safe_name,
        title=title,
        manage_pdf_tool=manage_pdf_tool,
        original_filename=original_filename,
        file_type="pdf",
        page_count=page_count,
        pages=pages,
    )


async def _create_draft_envelope_from_docx(
    user: dict,
    docx_bytes: bytes,
    filename: str,
    title: str,
    *,
    manage_pdf_tool: str,
    original_filename: str | None = None,
) -> dict:
    if not docx_bytes or docx_bytes[:2] != b"PK":
        raise HTTPException(status_code=400, detail="Invalid Word file")

    safe_name = (filename or "document.docx").strip() or "document.docx"
    if not safe_name.lower().endswith((".docx", ".doc")):
        safe_name = f"{safe_name}.docx"
    return await _persist_manage_pdf_envelope(
        user,
        file_bytes=docx_bytes,
        filename=safe_name,
        title=title,
        manage_pdf_tool=manage_pdf_tool,
        original_filename=original_filename,
        file_type="docx",
        page_count=0,
        pages=[],
    )


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
    text_color: Optional[List[float]] = Field(default=None, max_length=3)


class WhiteoutBody(BaseModel):
    page_index: int = Field(ge=0)
    rect_pct: RectPct


class AnnotateBody(BaseModel):
    page_index: int = Field(ge=0)
    kind: str = Field(max_length=16)
    rect_pct: RectPct
    color: Optional[List[float]] = Field(default=None, max_length=3)
    stroke_width: float = Field(default=1.5, ge=0.5, le=8)
    end_pct: Optional[OriginPct] = None
    url: Optional[str] = Field(default=None, max_length=2000)


class PageOpBody(BaseModel):
    op: str
    page_index: Optional[int] = None
    degrees: int = 90
    after_index: int = -1
    order: Optional[List[int]] = None


class SplitBody(BaseModel):
    ranges: str = Field(min_length=1, max_length=200)


class SplitSaveBody(BaseModel):
    ranges: str = Field(min_length=1, max_length=200)
    title: str = Field(default="", max_length=200)


class CompressBody(BaseModel):
    preset: str = Field(default="medium", max_length=16)
    grayscale: bool = False


class ProtectBody(BaseModel):
    user_password: str = Field(min_length=4, max_length=128)
    owner_password: Optional[str] = Field(default=None, max_length=128)
    allow_print: bool = True
    allow_copy: bool = False
    allow_modify: bool = False


class UnlockBody(BaseModel):
    password: str = Field(min_length=1, max_length=128)


async def _get_workspace(workspace_id: str, user: dict) -> dict:
    ws = await db.pdf_workspaces.find_one(
        {"workspace_id": workspace_id, "owner_id": user["user_id"]},
        {"_id": 0},
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def _load_workspace_pdf(ws: dict, user: dict) -> bytes:
    assert_can_access_document_bytes(user)
    return await download_document_file(
        ws["file_id"], WORKSPACE_SCOPE, ws["workspace_id"],
    )


async def _bytes_to_pdf(raw: bytes, filename: str) -> tuple[bytes, str, int, list, dict]:
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
        enc = pdf_service.get_encryption_status(pdf_bytes)
        if enc.get("needs_password"):
            page_count = int(enc.get("page_count") or 0)
            pages = []
        else:
            page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    except RuntimeError as exc:
        msg = str(exc)
        if "DOCX conversion unavailable" in msg or "conversion failed" in msg.lower():
            raise HTTPException(status_code=503, detail=msg) from exc
        raise HTTPException(status_code=400, detail="Could not process document") from exc
    except Exception as exc:
        logger.error(f"[pdf_manager] process upload: {exc}")
        raise HTTPException(status_code=400, detail="Could not process document") from exc
    return pdf_bytes, out_name, page_count, pages, enc


MAX_HISTORY = 10


def _version_snapshot(ws: dict) -> dict:
    return {
        "file_id": ws.get("file_id"),
        "filename": ws.get("filename"),
        "page_count": ws.get("page_count", 0),
        "pages": ws.get("pages", []),
    }


def _history_meta(ws_or_update: dict) -> dict:
    return {
        "can_undo": len(ws_or_update.get("history") or []) > 0,
        "can_redo": len(ws_or_update.get("redo_stack") or []) > 0,
    }


async def _save_workspace_pdf(ws: dict, pdf_bytes: bytes, filename: str | None = None) -> dict:
    wid = ws["workspace_id"]
    page_count, pages = pdf_service.get_pdf_info(pdf_bytes)
    out_name = filename or ws.get("filename") or "document.pdf"
    new_file_id = await upload_document_file(
        pdf_bytes, out_name, WORKSPACE_SCOPE, wid,
    )
    # Push the current version onto the undo history; a new edit clears redo.
    history = list(ws.get("history") or [])
    if ws.get("file_id"):
        history.append(_version_snapshot(ws))
    evicted = history[:-MAX_HISTORY]
    history = history[-MAX_HISTORY:]
    redo_stack = list(ws.get("redo_stack") or [])
    updated = {
        "file_id": new_file_id,
        "page_count": page_count,
        "pages": pages,
        "filename": out_name,
        "history": history,
        "redo_stack": [],
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.update_one({"workspace_id": wid}, {"$set": updated})
    for stale in evicted + redo_stack:
        if stale.get("file_id"):
            await delete_file(stale["file_id"])
    return {
        "workspace_id": wid,
        "filename": out_name,
        "page_count": page_count,
        "pages": pages,
        "updated_at": updated["updated_at"],
        **_history_meta(updated),
    }


def _parse_ranges(spec: str, page_count: int) -> list[tuple[int, int]]:
    try:
        return pdf_service.parse_page_ranges(spec, page_count)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@pdf_router.post("/ai-metadata-check")
async def check_ai_metadata(
    file: UploadFile = File(...),
    user: dict = Depends(_pdf_user),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_WORKSPACE_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")
    try:
        return ai_metadata_check.analyze_ai_metadata(
            raw,
            filename=file.filename or "document",
            content_type=file.content_type or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[pdf_manager] ai-metadata-check: %s", exc)
        raise HTTPException(status_code=400, detail="Could not analyse file metadata") from exc


class AiReportBody(BaseModel):
    report: dict


@pdf_router.post("/ai-metadata-check/report-pdf")
async def ai_metadata_report_pdf(
    body: AiReportBody,
    user: dict = Depends(_pdf_user),
):
    try:
        pdf_bytes = ai_metadata_check.build_report_pdf(body.report or {})
    except Exception as exc:
        logger.error("[pdf_manager] ai-metadata report-pdf: %s", exc)
        raise HTTPException(status_code=400, detail="Could not build scan report") from exc
    base = (body.report.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": _attachment_disposition(f"{base}-ai-scan-report.pdf")},
    )


@pdf_router.post("/workspace")
async def create_workspace(
    file: UploadFile = File(...),
    user: dict = Depends(_pdf_user),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_WORKSPACE_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")

    fname = file.filename or "document"
    if fname.lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only PDF and Word (.docx) files are supported")

    pdf_bytes, out_name, page_count, pages, enc = await _bytes_to_pdf(raw, fname)
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
        "encrypted": bool(enc.get("encrypted")),
        "needs_password": bool(enc.get("needs_password")),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.insert_one(dict(doc))
    return doc


@pdf_router.get("/workspace/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    return {**ws, **_history_meta(ws)}


@pdf_router.get("/workspace/{workspace_id}/page/{page_index}.png")
async def render_workspace_page(
    workspace_id: str,
    page_index: int,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page_index < 0 or page_index >= ws.get("page_count", 0):
        raise HTTPException(status_code=400, detail="Page index out of range")
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    if page_index < 0 or page_index >= ws.get("page_count", 0):
        raise HTTPException(status_code=400, detail="Page index out of range")
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
            body.text_color,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


@pdf_router.post("/workspace/{workspace_id}/text")
async def add_text_overlay(
    workspace_id: str,
    body: TextOverlayBody,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    try:
        updated_bytes = pdf_service.add_whiteout_overlay(
            pdf_bytes, body.page_index, body.rect_pct.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _save_workspace_pdf(ws, updated_bytes)


def _restore_response(wid: str, updated: dict) -> dict:
    return {
        "workspace_id": wid,
        "filename": updated["filename"],
        "page_count": updated["page_count"],
        "pages": updated["pages"],
        "updated_at": updated["updated_at"],
        **_history_meta(updated),
    }


@pdf_router.post("/workspace/{workspace_id}/undo")
async def undo_workspace_edit(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    history = list(ws.get("history") or [])
    if not history:
        raise HTTPException(status_code=400, detail="Nothing to undo")
    prev = history.pop()
    redo_stack = list(ws.get("redo_stack") or [])
    redo_stack.append(_version_snapshot(ws))
    updated = {
        "file_id": prev.get("file_id"),
        "filename": prev.get("filename") or ws.get("filename"),
        "page_count": prev.get("page_count", 0),
        "pages": prev.get("pages", []),
        "history": history,
        "redo_stack": redo_stack[-MAX_HISTORY:],
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.update_one({"workspace_id": workspace_id}, {"$set": updated})
    return _restore_response(workspace_id, updated)


@pdf_router.post("/workspace/{workspace_id}/redo")
async def redo_workspace_edit(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    redo_stack = list(ws.get("redo_stack") or [])
    if not redo_stack:
        raise HTTPException(status_code=400, detail="Nothing to redo")
    nxt = redo_stack.pop()
    history = list(ws.get("history") or [])
    history.append(_version_snapshot(ws))
    updated = {
        "file_id": nxt.get("file_id"),
        "filename": nxt.get("filename") or ws.get("filename"),
        "page_count": nxt.get("page_count", 0),
        "pages": nxt.get("pages", []),
        "history": history[-MAX_HISTORY:],
        "redo_stack": redo_stack,
        "updated_at": _now_iso(),
    }
    await db.pdf_workspaces.update_one({"workspace_id": workspace_id}, {"$set": updated})
    return _restore_response(workspace_id, updated)


@pdf_router.post("/workspace/{workspace_id}/annotate")
async def add_annotation(
    workspace_id: str,
    body: AnnotateBody,
    user: dict = Depends(_pdf_user),
):
    """Sejda-style annotations: highlight, rect, ellipse, line, check, cross, link."""
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    try:
        updated_bytes = pdf_service.add_annotation(
            pdf_bytes,
            body.page_index,
            body.kind,
            body.rect_pct.model_dump(),
            body.color,
            body.stroke_width,
            body.end_pct.model_dump() if body.end_pct else None,
            body.url,
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
    user: dict = Depends(_pdf_user),
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

    pdf_bytes = await _load_workspace_pdf(ws, user)
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
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
    user: dict = Depends(_pdf_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one file to append")
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    extras = []
    for f in files:
        raw = await f.read()
        if len(raw) > MAX_WORKSPACE_BYTES:
            raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")
        part_bytes, _, _, _, _ = await _bytes_to_pdf(raw, f.filename or "document.pdf")
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
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
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
        headers={"Content-Disposition": _attachment_disposition(f"{base}-split.zip")},
    )


@pdf_router.post("/workspace/{workspace_id}/split/save-to-documents")
async def split_save_to_documents(
    workspace_id: str,
    body: SplitSaveBody,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    ranges = _parse_ranges(body.ranges, ws.get("page_count", 0))
    parts = pdf_service.split_pdf_to_parts(pdf_bytes, ranges)
    base = (ws.get("original_filename") or ws.get("filename") or "document").rsplit(".", 1)[0]
    orig = ws.get("original_filename") or ws.get("filename")

    saved = []
    try:
        for i, part in enumerate(parts, start=1):
            if len(parts) == 1:
                title = (body.title or f"{base} (Split)").strip()
            else:
                title = f"{base} (Part {i})"
            env = await _create_draft_envelope_from_pdf(
                user,
                part,
                f"{base}-part-{i}.pdf",
                title,
                manage_pdf_tool="split",
                original_filename=orig,
            )
            saved.append(env)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[pdf_manager] split save: %s", exc)
        raise HTTPException(status_code=400, detail="Could not save split documents") from exc
    return {"saved_count": len(saved), "envelopes": saved}


@pdf_router.post("/workspace/{workspace_id}/compress")
async def compress_workspace(
    workspace_id: str,
    body: CompressBody,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    preset = (body.preset or "medium").lower().strip()
    if preset not in pdf_service.COMPRESS_PRESETS:
        raise HTTPException(status_code=400, detail="preset must be medium, good, or best")
    try:
        compressed, stats = pdf_service.compress_pdf_bytes(
            pdf_bytes,
            preset=preset,
            grayscale=body.grayscale,
        )
    except Exception as exc:
        logger.error("[pdf_manager] compress: %s", exc)
        raise HTTPException(status_code=400, detail="Could not compress document") from exc
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=compressed,
        media_type="application/pdf",
        headers={
            "Content-Disposition": _attachment_disposition(f"{base}-compressed.pdf"),
            "X-Original-Bytes": str(stats["original_bytes"]),
            "X-Compressed-Bytes": str(stats["compressed_bytes"]),
            "X-Savings-Percent": str(stats["savings_pct"]),
        },
    )


@pdf_router.post("/workspace/{workspace_id}/watermark")
async def watermark_workspace(
    workspace_id: str,
    kind: str = Form("text"),
    text: str = Form("CONFIDENTIAL"),
    font_name: str = Form("helv"),
    font_size: float = Form(48),
    opacity: float = Form(0.35),
    rotation: int = Form(45),
    position: str = Form("center"),
    x_pct: float = Form(0.5),
    y_pct: float = Form(0.5),
    page_range: str = Form("all"),
    image_scale: float = Form(0.35),
    color_r: float = Form(0.55),
    color_g: float = Form(0.55),
    color_b: float = Form(0.55),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    wm_kind = (kind or "text").lower().strip()
    image_bytes = None
    if wm_kind == "image":
        if not image:
            raise HTTPException(status_code=400, detail="Upload an image for image watermark")
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")
        if len(image_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large — maximum 5 MB")
    try:
        out = pdf_service.watermark_pdf_bytes(
            pdf_bytes,
            kind=wm_kind,
            text=text,
            font_name=font_name,
            font_size=font_size,
            color=[color_r, color_g, color_b],
            opacity=opacity,
            rotation=rotation,
            position=position,
            x_pct=x_pct,
            y_pct=y_pct,
            page_range=page_range,
            image_bytes=image_bytes,
            image_scale=image_scale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[pdf_manager] watermark: %s", exc)
        raise HTTPException(status_code=400, detail="Could not apply watermark") from exc
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=out,
        media_type="application/pdf",
        headers={"Content-Disposition": _attachment_disposition(f"{base}-watermarked.pdf")},
    )


@pdf_router.post("/workspace/{workspace_id}/protect")
async def protect_workspace(
    workspace_id: str,
    body: ProtectBody,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    if ws.get("needs_password"):
        raise HTTPException(
            status_code=400,
            detail="This PDF is password protected. Use Unlock PDF first.",
        )
    pdf_bytes = await _load_workspace_pdf(ws, user)
    try:
        protected = pdf_service.protect_pdf_bytes(
            pdf_bytes,
            user_password=body.user_password,
            owner_password=body.owner_password,
            allow_print=body.allow_print,
            allow_copy=body.allow_copy,
            allow_modify=body.allow_modify,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[pdf_manager] protect: %s", exc)
        raise HTTPException(status_code=400, detail="Could not protect document") from exc
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=protected,
        media_type="application/pdf",
        headers={"Content-Disposition": _attachment_disposition(f"{base}-protected.pdf")},
    )


@pdf_router.post("/workspace/{workspace_id}/unlock")
async def unlock_workspace(
    workspace_id: str,
    body: UnlockBody,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    try:
        unlocked = pdf_service.unlock_pdf_bytes(pdf_bytes, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[pdf_manager] unlock: %s", exc)
        raise HTTPException(status_code=400, detail="Could not unlock document") from exc
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=unlocked,
        media_type="application/pdf",
        headers={"Content-Disposition": _attachment_disposition(f"{base}-unlocked.pdf")},
    )


@pdf_router.post("/workspace/{workspace_id}/pdf-to-word")
async def pdf_to_word_workspace(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    if ws.get("needs_password"):
        raise HTTPException(
            status_code=400,
            detail="This PDF is password protected. Use Unlock PDF first.",
        )
    pdf_bytes = await _load_workspace_pdf(ws, user)
    try:
        docx_bytes = pdf_service.convert_pdf_to_docx_bytes(pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[pdf_manager] pdf-to-word: %s", exc)
        raise HTTPException(status_code=400, detail="Could not convert PDF to Word") from exc
    base = (ws.get("filename") or "document").rsplit(".", 1)[0]
    return FastResponse(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": _attachment_disposition(f"{base}.docx")},
    )


@pdf_router.post("/workspace/{workspace_id}/word-to-pdf")
async def word_to_pdf_workspace(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    orig = (ws.get("original_filename") or ws.get("filename") or "").lower()
    if not orig.endswith((".docx", ".doc")):
        raise HTTPException(
            status_code=400,
            detail="Upload a Word (.docx) file — this workspace was not created from Word",
        )
    pdf_bytes = await _load_workspace_pdf(ws, user)
    if not pdf_bytes or pdf_bytes[:4] != b"%PDF":
        raise HTTPException(status_code=400, detail="Could not load converted PDF")
    base = (ws.get("original_filename") or ws.get("filename") or "document").rsplit(".", 1)[0]
    out_name = f"{base}.pdf"
    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": _attachment_disposition(out_name),
            "X-Page-Count": str(ws.get("page_count") or 0),
        },
    )


@pdf_router.get("/workspace/{workspace_id}/download")
async def download_workspace(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    fname = ws.get("filename") or "document.pdf"
    return FastResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": _attachment_disposition(fname)},
    )


@pdf_router.post("/save-to-documents")
async def save_pdf_to_documents(
    file: UploadFile = File(...),
    title: str = Form(""),
    tool: str = Form("edit"),
    original_filename: str = Form(""),
    user: dict = Depends(_pdf_user),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_WORKSPACE_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum size is 20 MB")
    fname = (file.filename or original_filename or "document.pdf").strip() or "document.pdf"
    base = fname.rsplit(".", 1)[0]
    suffix = {
        "compress": "compressed",
        "watermark": "watermarked",
        "protect": "protected",
        "unlock": "unlocked",
        "merge": "merged",
        "word_to_pdf": "converted",
        "split": "split",
        "pdf_to_word": "converted to Word",
        "ai_metadata": "AI scan report",
    }.get((tool or "edit").lower().strip(), "edited")
    default_title = f"{base} ({suffix.replace('_', ' ').title()})"
    tool_key = (tool or "edit").lower().strip()
    env_title = (title or default_title).strip()
    orig = original_filename or fname
    is_docx = (
        fname.lower().endswith((".docx", ".doc"))
        or (raw[:2] == b"PK" and tool_key == "pdf_to_word")
    )
    if is_docx:
        return await _create_draft_envelope_from_docx(
            user, raw, fname, env_title,
            manage_pdf_tool=tool_key,
            original_filename=orig,
        )
    return await _create_draft_envelope_from_pdf(
        user,
        raw,
        fname,
        env_title,
        manage_pdf_tool=tool_key,
        original_filename=orig,
    )


@pdf_router.post("/workspace/{workspace_id}/save-to-documents")
async def save_workspace_to_documents(
    workspace_id: str,
    title: str = Form(""),
    tool: str = Form("edit"),
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    pdf_bytes = await _load_workspace_pdf(ws, user)
    base = (ws.get("original_filename") or ws.get("filename") or "document").rsplit(".", 1)[0]
    env_title = (title or f"{base} (Edited)").strip()
    return await _create_draft_envelope_from_pdf(
        user,
        pdf_bytes,
        ws.get("filename") or "document.pdf",
        env_title,
        manage_pdf_tool=(tool or "edit").lower().strip(),
        original_filename=ws.get("original_filename") or ws.get("filename"),
    )


@pdf_router.delete("/workspace/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user: dict = Depends(_pdf_user),
):
    ws = await _get_workspace(workspace_id, user)
    file_ids = {ws.get("file_id")}
    for snap in (ws.get("history") or []) + (ws.get("redo_stack") or []):
        file_ids.add(snap.get("file_id"))
    await db.pdf_workspaces.delete_one({"workspace_id": workspace_id})
    for fid in file_ids:
        if fid:
            await delete_file(fid)
    return {"ok": True, "workspace_id": workspace_id}