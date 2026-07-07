"""Contact address book — reusable signer directory."""
import re
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from db import db
from auth import get_current_user
from rate_limits import limiter

logger = logging.getLogger("civicsign.contacts")

contacts_router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def _now():
    return datetime.now(timezone.utc).isoformat()


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=40)
    notes: Optional[str] = Field(None, max_length=500)


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=40)
    notes: Optional[str] = Field(None, max_length=500)


@contacts_router.get("")
@limiter.limit("60/minute")
async def list_contacts(
    request: Request,
    q: str = Query("", max_length=80),
    user: dict = Depends(get_current_user),
):
    query = {"owner_id": user["user_id"]}
    if q.strip():
        needle = re.escape(q.strip())
        query["$or"] = [
            {"name": {"$regex": needle, "$options": "i"}},
            {"email": {"$regex": needle, "$options": "i"}},
            {"company": {"$regex": needle, "$options": "i"}},
        ]
    rows = await db.contacts.find(query, {"_id": 0}).sort("name", 1).limit(500).to_list(500)
    return rows


@contacts_router.post("")
@limiter.limit("30/minute")
async def create_contact(request: Request, body: ContactCreate, user: dict = Depends(get_current_user)):
    email = body.email.lower().strip()
    dup = await db.contacts.find_one({"owner_id": user["user_id"], "email": email})
    if dup:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    doc = {
        "contact_id": f"cnt_{uuid.uuid4().hex[:12]}",
        "owner_id": user["user_id"],
        "name": body.name.strip(),
        "email": email,
        "company": (body.company or "").strip() or None,
        "phone": (body.phone or "").strip() or None,
        "notes": (body.notes or "").strip() or None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.contacts.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@contacts_router.patch("/{contact_id}")
@limiter.limit("30/minute")
async def update_contact(
    request: Request, contact_id: str, body: ContactUpdate, user: dict = Depends(get_current_user),
):
    doc = await db.contacts.find_one({"contact_id": contact_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    updates = {"updated_at": _now()}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.email is not None:
        updates["email"] = body.email.lower().strip()
    if body.company is not None:
        updates["company"] = body.company.strip() or None
    if body.phone is not None:
        updates["phone"] = body.phone.strip() or None
    if body.notes is not None:
        updates["notes"] = body.notes.strip() or None
    await db.contacts.update_one(
        {"contact_id": contact_id, "owner_id": user["user_id"]},
        {"$set": updates},
    )
    return await db.contacts.find_one(
        {"contact_id": contact_id, "owner_id": user["user_id"]},
        {"_id": 0},
    )


@contacts_router.delete("/{contact_id}")
@limiter.limit("30/minute")
async def delete_contact(request: Request, contact_id: str, user: dict = Depends(get_current_user)):
    res = await db.contacts.delete_one({"contact_id": contact_id, "owner_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"ok": True}


@contacts_router.post("/import-from-history")
@limiter.limit("5/minute")
async def import_from_history(request: Request, user: dict = Depends(get_current_user)):
    """One-click import distinct recipients from past envelopes."""
    envs = await db.envelopes.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "recipients": 1},
    ).sort("created_at", -1).limit(300).to_list(300)
    existing = {
        c["email"]
        for c in await db.contacts.find({"owner_id": user["user_id"]}, {"email": 1, "_id": 0}).to_list(2000)
    }
    added = 0
    for env in envs:
        for r in env.get("recipients") or []:
            email = (r.get("email") or "").lower().strip()
            name = (r.get("name") or "").strip()
            if not email or email in existing:
                continue
            await db.contacts.insert_one({
                "contact_id": f"cnt_{uuid.uuid4().hex[:12]}",
                "owner_id": user["user_id"],
                "name": name or email,
                "email": email,
                "company": None,
                "phone": None,
                "notes": "Imported from send history",
                "created_at": _now(),
                "updated_at": _now(),
            })
            existing.add(email)
            added += 1
    return {"imported": added}