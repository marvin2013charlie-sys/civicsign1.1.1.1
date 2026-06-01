"""Pydantic request/response models for CIVICSIGN."""
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


# ---- Envelope building blocks ----
class RecipientIn(BaseModel):
    recipient_id: Optional[str] = None
    name: str
    email: EmailStr
    order: int = 1
    color: Optional[str] = None


class FieldIn(BaseModel):
    field_id: Optional[str] = None
    recipient_id: str
    page: int = 0
    type: str  # signature | initials | date | text | checkbox
    # percentage coordinates (0..1) relative to page width/height, top-left origin
    x: float
    y: float
    w: float
    h: float
    required: bool = True
    label: Optional[str] = None
    value: Optional[Any] = None


class EnvelopeUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    signing_order: Optional[str] = None  # 'sequential' | 'parallel'
    recipients: Optional[List[RecipientIn]] = None
    fields: Optional[List[FieldIn]] = None


class SendRequest(BaseModel):
    base_url: Optional[str] = None
    message: Optional[str] = None


class SignFieldValue(BaseModel):
    field_id: str
    value: Any


class SignSubmit(BaseModel):
    consent: bool = True
    signer_name: Optional[str] = None
    values: List[SignFieldValue] = []


class DeclineRequest(BaseModel):
    reason: Optional[str] = None
