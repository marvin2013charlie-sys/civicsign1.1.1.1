"""
Blog post + internal staff management for the admin/internal-team portal.

Roles in CivicSign:
  - admin: super-admin with full access (billing, refunds, audit, users, blog, staff).
  - staff: internal team member with limited access (blog management only).
  - user / business: regular customers (no admin access).

Routes here serve both the public site (read-only) and the admin portal
(read/write, role-gated).
"""
from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from auth import require_admin, require_permission, hash_password, _validate_password_strength
from db import db




# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class BlogBlock(BaseModel):
    type: str  # "h2" | "h3" | "p" | "ul" | "callout" | "quote"
    # `content` can be a string OR a list of strings (for "ul")
    content: object


class BlogPostIn(BaseModel):
    slug: Optional[str] = None
    title: str
    excerpt: str
    category: str
    image: str
    author: Optional[str] = "CivicSign Editorial"
    read_time: Optional[str] = None
    body: List[BlogBlock]
    published: bool = True


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    author: Optional[str] = None
    read_time: Optional[str] = None
    body: Optional[List[BlogBlock]] = None
    published: Optional[bool] = None


class StaffCreate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    permissions: List[str] = Field(default_factory=lambda: ["blog"])
    # Future-proof: a staff member could be granted ["blog", "contacts", "users-read"] etc.


class StaffPasswordReset(BaseModel):
    password: str = Field(min_length=8)


class StaffStatusUpdate(BaseModel):
    active: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(value: str) -> str:
    v = value.lower().strip()
    v = re.sub(r"[^a-z0-9]+", "-", v)
    return v.strip("-")[:80] or secrets.token_hex(6)


def _estimate_read_time(body: List[BlogBlock]) -> str:
    words = 0
    for b in body:
        if isinstance(b.content, str):
            words += len(b.content.split())
        elif isinstance(b.content, list):
            for item in b.content:
                words += len(str(item).split())
    minutes = max(1, round(words / 220))
    return f"{minutes} min read"


def _serialize_post(doc: dict) -> dict:
    return {
        "slug": doc["slug"],
        "title": doc["title"],
        "excerpt": doc["excerpt"],
        "category": doc["category"],
        "image": doc["image"],
        "author": doc.get("author", "CivicSign Editorial"),
        "date": doc.get("date") or _format_date(doc.get("created_at")),
        "readTime": doc.get("read_time"),
        "body": doc.get("body", []),
        "published": doc.get("published", True),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def _format_date(iso: Optional[str]) -> str:
    if not iso:
        return ""
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%b %d, %Y")
    except Exception:
        return ""


def _public_staff(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "name": u.get("name"),
        "email": u["email"],
        "role": u.get("role"),
        "permissions": u.get("permissions", []),
        "active": u.get("active", True),
        "created_at": u.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Public blog read endpoints
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/api/blog", tags=["blog-public"])


@public_router.get("/posts")
async def list_posts_public(category: Optional[str] = Query(None)):
    q = {"published": True}
    if category and category != "All":
        q["category"] = category
    cursor = db.blog_posts.find(q, {"_id": 0}).sort("created_at", -1)
    return [_serialize_post(d) async for d in cursor]


@public_router.get("/posts/{slug}")
async def get_post_public(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(doc)


# ---------------------------------------------------------------------------
# Admin / staff blog CRUD
# ---------------------------------------------------------------------------

admin_router = APIRouter(prefix="/api/admin", tags=["admin-blog"])


@admin_router.get("/blog/posts")
async def admin_list_posts(actor: dict = Depends(require_permission("blog"))):
    cursor = db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1)
    return [_serialize_post(d) async for d in cursor]


@admin_router.get("/blog/posts/{slug}")
async def admin_get_post(slug: str, actor: dict = Depends(require_permission("blog"))):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(doc)


@admin_router.post("/blog/posts")
async def admin_create_post(body: BlogPostIn, actor: dict = Depends(require_permission("blog"))):
    slug = (body.slug or slugify(body.title)).strip()
    if not slug:
        raise HTTPException(status_code=400, detail="Could not generate slug from title")
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=409, detail="A post with this slug already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "slug": slug,
        "title": body.title.strip(),
        "excerpt": body.excerpt.strip(),
        "category": body.category.strip(),
        "image": body.image.strip(),
        "author": (body.author or actor.get("name") or "CivicSign Editorial").strip(),
        "read_time": body.read_time or _estimate_read_time(body.body),
        "body": [b.model_dump() for b in body.body],
        "published": body.published,
        "created_at": now,
        "updated_at": now,
        "created_by": actor["user_id"],
        "date": datetime.now(timezone.utc).strftime("%b %d, %Y"),
    }
    await db.blog_posts.insert_one(doc)
    return _serialize_post(doc)


@admin_router.put("/blog/posts/{slug}")
async def admin_update_post(slug: str, body: BlogPostUpdate, actor: dict = Depends(require_permission("blog"))):
    existing = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "body" in update:
        update["body"] = [b for b in update["body"]]
        if "read_time" not in update or not update.get("read_time"):
            update["read_time"] = _estimate_read_time([BlogBlock(**b) for b in update["body"]])
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"slug": slug}, {"$set": update})
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    return _serialize_post(doc)


@admin_router.delete("/blog/posts/{slug}")
async def admin_delete_post(slug: str, actor: dict = Depends(require_permission("blog"))):
    res = await db.blog_posts.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Internal staff CRUD (super-admin only)
# ---------------------------------------------------------------------------

@admin_router.get("/staff")
async def list_staff(admin: dict = Depends(require_admin)):
    cursor = db.users.find({"role": {"$in": ["admin", "staff"]}}, {"_id": 0}).sort("created_at", 1)
    return [_public_staff(u) async for u in cursor]


@admin_router.post("/staff")
async def create_staff(body: StaffCreate, admin: dict = Depends(require_admin)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with that email already exists")
    is_valid, err = _validate_password_strength(body.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)
    allowed = {"blog", "contacts", "users-read", "careers", "envelopes", "billing", "audit", "impersonate"}
    perms = sorted(set(body.permissions) & allowed) or ["blog"]
    user = {
        "user_id": "user_" + secrets.token_hex(8),
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "auth_provider": "password",
        "role": "staff",
        "permissions": perms,
        "plan": "business",
        "active": True,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["user_id"],
        "picture": None,
        "company": "CivicSign",
        "job_title": "Internal team",
    }
    await db.users.insert_one(user)
    return _public_staff(user)


@admin_router.delete("/staff/{user_id}")
async def delete_staff(user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Super-admin accounts cannot be deleted via this endpoint")
    if target["user_id"] == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    await db.users.delete_one({"user_id": user_id})
    return {"ok": True}


@admin_router.post("/staff/{user_id}/reset-password")
async def reset_staff_password(
    user_id: str,
    body: StaffPasswordReset,
    admin: dict = Depends(require_admin),
):
    """Super-admin sets a new password for a staff member.

    The new password takes effect immediately. The staff member uses the new
    password the next time they sign in at /admin/login. No email is sent — the
    admin shares the credentials out-of-band, just like at account creation."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if target.get("role") != "staff":
        raise HTTPException(status_code=400, detail="This endpoint only resets staff passwords")
    is_valid, err = _validate_password_strength(body.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "password_hash": hash_password(body.password),
            "password_reset_at": datetime.now(timezone.utc).isoformat(),
            "password_reset_by": admin["user_id"],
        }},
    )
    return {"ok": True, "email": target["email"]}


@admin_router.patch("/staff/{user_id}/status")
async def update_staff_status(
    user_id: str,
    body: StaffStatusUpdate,
    admin: dict = Depends(require_admin),
):
    """Hold or resume a staff member's access. When active=false they cannot
    sign in but the account, permissions and audit history are preserved."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if target.get("role") != "staff":
        raise HTTPException(status_code=400, detail="This endpoint only manages staff accounts")
    if target["user_id"] == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own status")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "active": bool(body.active),
            "status_changed_at": datetime.now(timezone.utc).isoformat(),
            "status_changed_by": admin["user_id"],
        }},
    )
    return {"ok": True, "active": bool(body.active)}
