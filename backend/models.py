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


class VerifyEmail(BaseModel):
    email: EmailStr
    code: str


class ResendVerification(BaseModel):
    email: EmailStr


class ForgotPassword(BaseModel):
    email: EmailStr
    base_url: Optional[str] = None


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
    expires_in_days: Optional[int] = None


class SignFieldValue(BaseModel):
    field_id: str
    value: Any


class SignSubmit(BaseModel):
    consent: bool = True
    signer_name: Optional[str] = None
    values: List[SignFieldValue] = []


class DeclineRequest(BaseModel):
    reason: Optional[str] = None


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str = Field(min_length=1)


# ---- Templates ----
class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class RoleAssignment(BaseModel):
    role_id: str
    name: str
    email: EmailStr


class TemplateUse(BaseModel):
    recipients: List[RoleAssignment]


class BulkRow(BaseModel):
    name: str
    email: EmailStr


class BulkSend(BaseModel):
    base_url: Optional[str] = None
    message: Optional[str] = None
    rows: List[BulkRow]


class RemindRequest(BaseModel):
    base_url: Optional[str] = None


# ---- User profile / account settings ----
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class SubscriptionUpdate(BaseModel):
    plan: str  # free | pro | business


# ---- Admin ----
class AdminUserUpdate(BaseModel):
    role: Optional[str] = None      # user | admin
    active: Optional[bool] = None
    plan: Optional[str] = None      # free | pro | business


class ContactHandle(BaseModel):
    handled: bool = True


# ---- AI assistant ----
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: Optional[List[ChatMessage]] = None


# ---- Account ----
class AccountDelete(BaseModel):
    confirm: str


# ---- Billing (Stripe) ----
class CheckoutRequest(BaseModel):
    plan_id: str            # pro | business
    origin_url: str


# ---- Admin: impersonation & password reset ----
class ImpersonateVerify(BaseModel):
    request_id: str
    otp: str


class SendReset(BaseModel):
    base_url: Optional[str] = None


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(min_length=6)



# ---- Admin: billing/refunds ----
class RefundRequest(BaseModel):
    amount: Optional[float] = None  # if None -> full refund
    reason: Optional[str] = None    # admin-supplied note
    downgrade_plan: Optional[bool] = True  # also downgrade user to free

