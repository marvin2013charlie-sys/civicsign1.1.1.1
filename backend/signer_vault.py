"""Saved signer signatures — reuse on repeat signings (no account required)."""
import base64
import binascii
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from rate_limits import limiter
from security_utils import sniff_image_type

from db import db

logger = logging.getLogger("civicsign.signer_vault")

vault_router = APIRouter(prefix="/api/sign", tags=["signer-vault"])


def _now():
    return datetime.now(timezone.utc).isoformat()


ALLOWED_SIGNATURE_PREFIXES = (
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
)


class SaveSignatureBody(BaseModel):
    signature_data: str = Field(min_length=20, max_length=2_000_000)
    signature_type: str = Field(default="drawn", pattern="^(drawn|typed|upload)$")


async def _recipient_from_token(token: str) -> tuple[dict, dict]:
    env = await db.envelopes.find_one({"recipients.access_token": token}, {"_id": 0})
    if not env:
        raise HTTPException(status_code=404, detail="Invalid signing link")
    rcp = next((r for r in env.get("recipients", []) if r.get("access_token") == token), None)
    if not rcp:
        raise HTTPException(status_code=404, detail="Invalid signing link")
    return env, rcp


@vault_router.get("/{token}/saved-signature")
@limiter.limit("60/minute")
async def get_saved_signature(request: Request, token: str):
    _, rcp = await _recipient_from_token(token)
    email = (rcp.get("email") or "").lower().strip()
    if not email:
        return {"signature": None}
    row = await db.signer_signatures.find_one({"email": email}, {"_id": 0})
    if not row:
        return {"signature": None}
    return {
        "signature": {
            "signature_data": row.get("signature_data"),
            "signature_type": row.get("signature_type", "drawn"),
            "updated_at": row.get("updated_at"),
        },
    }


@vault_router.put("/{token}/saved-signature")
@limiter.limit("20/hour")
async def save_signature(request: Request, token: str, body: SaveSignatureBody):
    _, rcp = await _recipient_from_token(token)
    email = (rcp.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Cannot save signature without email")
    data = body.signature_data.strip()
    # Raster formats only. "data:image" alone would admit SVG, which can carry
    # script and external references if the value is ever rendered inline.
    if not data.startswith(ALLOWED_SIGNATURE_PREFIXES):
        raise HTTPException(status_code=400, detail="Invalid signature format — PNG or JPEG only")
    # The declared type is attacker-controlled, so confirm the bytes agree.
    try:
        raw = base64.b64decode(data.split(",", 1)[1], validate=True)
    except (IndexError, ValueError, binascii.Error):
        raise HTTPException(status_code=400, detail="Invalid signature encoding")
    if sniff_image_type(raw) not in ("image/png", "image/jpeg"):
        raise HTTPException(status_code=400, detail="Invalid signature format — PNG or JPEG only")
    await db.signer_signatures.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "signature_data": data[:2_000_000],
            "signature_type": body.signature_type,
            "updated_at": _now(),
        }},
        upsert=True,
    )
    return {"ok": True}