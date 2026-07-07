"""
Careers module — public job listings + admin management + applications inbox.

Mirrors the blog pattern: a public router (read-only listings + apply form) and
an admin router (CRUD on jobs + review applications), gated by the new
`careers` staff permission so super-admins can delegate the careers area to a
trusted staff member without giving them billing / audit / impersonation
powers.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field

from auth import require_permission
from db import db
from rate_limits import limiter


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

JOB_TYPES = {"full-time", "part-time", "contract", "internship"}
WORKPLACE_TYPES = {"remote", "hybrid", "on-site"}
APPLICATION_STATUSES = ("new", "reviewing", "contacted", "rejected", "hired")


class JobIn(BaseModel):
    slug: Optional[str] = None
    title: str = Field(min_length=2, max_length=120)
    department: str = Field(min_length=1, max_length=80)
    location: str = Field(min_length=1, max_length=80)  # e.g. "London, UK"
    job_type: str = "full-time"
    workplace: str = "hybrid"
    summary: str = Field(min_length=10, max_length=400)
    description: str = Field(min_length=20)  # markdown / plain text
    salary: Optional[str] = None  # display string e.g. "£55k – £75k"
    published: bool = True


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    workplace: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    salary: Optional[str] = None
    published: Optional[bool] = None


class ApplicationIn(BaseModel):
    job_slug: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    cover_message: str = Field(min_length=20, max_length=4000)


class ApplicationStatusUpdate(BaseModel):
    status: str  # one of APPLICATION_STATUSES
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(s: str) -> str:
    out = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return out[:80] or "job"


def _serialize_job(d: dict) -> dict:
    d.pop("_id", None)
    return d


def _serialize_application(d: dict) -> dict:
    d.pop("_id", None)
    return d


# ---------------------------------------------------------------------------
# Public router  — careers landing & job detail & apply
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/api/careers", tags=["careers-public"])


@public_router.get("/jobs")
async def list_public_jobs():
    """Returns published jobs only, newest first."""
    cursor = db.job_posts.find({"published": True}, {"_id": 0}).sort("created_at", -1)
    return [_serialize_job(d) async for d in cursor]


@public_router.get("/jobs/{slug}")
async def get_public_job(slug: str):
    doc = await db.job_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Position not found or no longer open")
    return _serialize_job(doc)


@public_router.post("/apply")
@limiter.limit("10/hour")
async def submit_application(request: Request, body: ApplicationIn):
    job = await db.job_posts.find_one({"slug": body.job_slug, "published": True})
    if not job:
        raise HTTPException(status_code=404, detail="Position is no longer open")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "application_id": f"app_{uuid.uuid4().hex[:16]}",
        "job_id": job.get("job_id"),
        "job_slug": body.job_slug,
        "job_title": job.get("title"),
        "name": body.name.strip(),
        "email": body.email.lower(),
        "phone": (body.phone or "").strip() or None,
        "linkedin": (body.linkedin or "").strip() or None,
        "portfolio": (body.portfolio or "").strip() or None,
        "cover_message": body.cover_message.strip(),
        "status": "new",
        "note": "",
        "created_at": now,
        "handled_at": None,
        "handled_by": None,
        "ip": request.client.host if request.client else None,
    }
    await db.job_applications.insert_one(doc)
    return {"ok": True, "application_id": doc["application_id"]}


# ---------------------------------------------------------------------------
# Admin router  — manage jobs + review applications
# Gated by the `careers` permission (admins always allowed).
# ---------------------------------------------------------------------------

admin_router = APIRouter(prefix="/api/admin/careers", tags=["careers-admin"])


def _validate_choices(body_dict: dict):
    if "job_type" in body_dict and body_dict["job_type"] is not None and body_dict["job_type"] not in JOB_TYPES:
        raise HTTPException(status_code=400, detail=f"job_type must be one of {sorted(JOB_TYPES)}")
    if "workplace" in body_dict and body_dict["workplace"] is not None and body_dict["workplace"] not in WORKPLACE_TYPES:
        raise HTTPException(status_code=400, detail=f"workplace must be one of {sorted(WORKPLACE_TYPES)}")


@admin_router.get("/jobs")
async def admin_list_jobs(actor: dict = Depends(require_permission("careers"))):
    cursor = db.job_posts.find({}, {"_id": 0}).sort("created_at", -1)
    return [_serialize_job(d) async for d in cursor]


@admin_router.get("/jobs/{slug}")
async def admin_get_job(slug: str, actor: dict = Depends(require_permission("careers"))):
    doc = await db.job_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Position not found")
    return _serialize_job(doc)


@admin_router.post("/jobs")
async def admin_create_job(body: JobIn, actor: dict = Depends(require_permission("careers"))):
    _validate_choices(body.dict())
    slug = _slugify(body.slug or body.title)
    # ensure unique slug
    existing = await db.job_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "job_id": f"job_{uuid.uuid4().hex[:16]}",
        "slug": slug,
        "title": body.title.strip(),
        "department": body.department.strip(),
        "location": body.location.strip(),
        "job_type": body.job_type,
        "workplace": body.workplace,
        "summary": body.summary.strip(),
        "description": body.description.strip(),
        "salary": (body.salary or "").strip() or None,
        "published": bool(body.published),
        "created_at": now,
        "updated_at": now,
        "created_by": actor["user_id"],
    }
    await db.job_posts.insert_one(doc)
    return _serialize_job({**doc})


@admin_router.put("/jobs/{slug}")
async def admin_update_job(slug: str, body: JobUpdate, actor: dict = Depends(require_permission("careers"))):
    existing = await db.job_posts.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Position not found")
    patch = {k: v for k, v in body.dict().items() if v is not None}
    _validate_choices(patch)
    if "title" in patch:
        patch["title"] = patch["title"].strip()
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    patch["updated_by"] = actor["user_id"]
    await db.job_posts.update_one({"slug": slug}, {"$set": patch})
    doc = await db.job_posts.find_one({"slug": slug}, {"_id": 0})
    return _serialize_job(doc)


@admin_router.delete("/jobs/{slug}")
async def admin_delete_job(slug: str, actor: dict = Depends(require_permission("careers"))):
    res = await db.job_posts.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Position not found")
    return {"ok": True}


@admin_router.get("/applications")
async def admin_list_applications(
    status: str = Query("", description="Filter by status: new|reviewing|contacted|rejected|hired"),
    actor: dict = Depends(require_permission("careers")),
):
    query = {}
    if status:
        if status not in APPLICATION_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        query["status"] = status
    cursor = db.job_applications.find(query, {"_id": 0}).sort("created_at", -1)
    return [_serialize_application(d) async for d in cursor]


@admin_router.patch("/applications/{application_id}")
async def admin_update_application(
    application_id: str,
    body: ApplicationStatusUpdate,
    actor: dict = Depends(require_permission("careers")),
):
    if body.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    existing = await db.job_applications.find_one({"application_id": application_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Application not found")
    patch = {
        "status": body.status,
        "handled_at": datetime.now(timezone.utc).isoformat(),
        "handled_by": actor["user_id"],
    }
    if body.note is not None:
        patch["note"] = body.note
    await db.job_applications.update_one({"application_id": application_id}, {"$set": patch})
    doc = await db.job_applications.find_one({"application_id": application_id}, {"_id": 0})
    return _serialize_application(doc)
