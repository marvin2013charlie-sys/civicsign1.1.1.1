"""Pydantic request/response models for CivicSign."""
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    invite_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmail(BaseModel):
    email: EmailStr
    code: str


class ResendVerification(BaseModel):
    email: EmailStr


class ForgotPassword(BaseModel):
    email: EmailStr
    base_url: Optional[str] = None


class EmailChangeRequest(BaseModel):
    email: EmailStr


# ---- Envelope building blocks ----
class RecipientIn(BaseModel):
    recipient_id: Optional[str] = None
    name: str
    email: EmailStr
    order: int = 1
    color: Optional[str] = None
    auth_method: Optional[str] = None   # None | sms | kba | identity (Business plan)
    auth_phone: Optional[str] = None      # required when auth_method=sms
    auth_kba_postcode: Optional[str] = None  # required when auth_method=kba


class FieldIn(BaseModel):
    field_id: Optional[str] = None
    recipient_id: str
    page: int = 0
    type: str  # signature | initials | date | text | checkbox | fullname | email | company | jobtitle | signdate | stamp | image | attachment | dropdown | radio
    # percentage coordinates (0..1) relative to page width/height, top-left origin
    x: float
    y: float
    w: float
    h: float
    required: bool = True
    label: Optional[str] = None
    options: Optional[List[str]] = None
    value: Optional[Any] = None


class EnvelopeUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    signing_order: Optional[str] = None  # 'sequential' | 'parallel'
    recipients: Optional[List[RecipientIn]] = None
    fields: Optional[List[FieldIn]] = None


class BulkVerifyRequest(BaseModel):
    envelope_ids: Optional[List[str]] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)
    migrate_stale: bool = True


class SendRequest(BaseModel):
    base_url: Optional[str] = None
    message: Optional[str] = None
    expires_in_days: Optional[int] = None
    auto_remind_enabled: Optional[bool] = None
    auto_remind_days: Optional[int] = Field(None, ge=1, le=30)
    auto_remind_max: Optional[int] = Field(None, ge=1, le=10)
    signature_level: Optional[str] = None  # basic | ses | aes | qes (plan-gated)


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
    signature_level: Optional[str] = None
    rows: List[BulkRow]


class SignerAuthVerify(BaseModel):
    code: Optional[str] = None
    postcode: Optional[str] = None


class ApiKeyCreate(BaseModel):
    label: Optional[str] = None


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    enabled: Optional[bool] = None
    events: Optional[List[str]] = None
    regenerate_secret: Optional[bool] = None


class RemindRequest(BaseModel):
    base_url: Optional[str] = None


# ---- User profile / account settings ----
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    # Extended business profile (UK-friendly)
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None        # work / landline
    country: Optional[str] = None      # ISO country name, defaults to United Kingdom
    city: Optional[str] = None
    postcode: Optional[str] = None     # UK postcode style
    vat_number: Optional[str] = None
    company_size: Optional[str] = None # "1", "2-10", "11-50", "51-200", "200+"
    industry: Optional[str] = None
    timezone: Optional[str] = None     # e.g. "Europe/London"
    marketing_opt_in: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SubscriptionUpdate(BaseModel):
    plan: str  # free | pro | business


# ---- Admin ----
class AdminUserUpdate(BaseModel):
    role: Optional[str] = None      # user | admin
    active: Optional[bool] = None
    plan: Optional[str] = None      # free | pro | business
    # Paid grant length: 15d | 1m | 3m | 6m | 1y (required when plan is pro/business)
    plan_duration: Optional[str] = None
    monthly_envelope_limit: Optional[int] = None   # contract cap (Business); omit to clear
    enterprise_unlimited: Optional[bool] = None    # signed enterprise — no monthly cap
    org_id: Optional[str] = None                   # assign to org pool; "" to remove


class AdminUserDelete(BaseModel):
    """Confirm permanent deletion of a customer account."""
    confirm: str = Field(..., min_length=6, max_length=20)


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    monthly_envelope_limit: Optional[int] = None
    enterprise_unlimited: Optional[bool] = False
    owner_name: str = Field(min_length=1, max_length=100)
    owner_email: EmailStr
    owner_password: str = Field(min_length=8)


class OrgMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class OrgMemberPasswordReset(BaseModel):
    password: str = Field(min_length=8)


class OrgMemberStatusUpdate(BaseModel):
    active: bool


class OrgMemberQuotaUpdate(BaseModel):
    """Organisation owner sets per-member monthly document allowance (≤ org per-seat cap)."""
    monthly_seat_limit: Optional[int] = Field(None, ge=1, le=100000)


class OrgInviteCreate(BaseModel):
    """Invite a colleague by email — they set their own password when accepting."""
    email: EmailStr
    name: Optional[str] = Field(None, max_length=100)
    monthly_seat_limit: Optional[int] = Field(None, ge=1, le=100000)
    feature_flags: Optional[dict[str, bool]] = None
    base_url: Optional[str] = None


class OrgInviteAccept(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    monthly_envelope_limit: Optional[int] = None
    enterprise_unlimited: Optional[bool] = None


class ContactHandle(BaseModel):
    handled: bool = True


# ---- AI assistant ----
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: Optional[List[ChatMessage]] = None


class AuthChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: Optional[List[ChatMessage]] = None
    context: Optional[str] = Field(default="login", max_length=32)


# ---- Account ----
class AccountDelete(BaseModel):
    confirm: str


# ---- Billing (Stripe) ----
class CheckoutRequest(BaseModel):
    plan_id: str            # pro | business
    origin_url: str = ""
    billing_interval: str = "monthly"  # monthly | yearly (yearly = 10 months paid)


class UpgradeConfirmRequest(BaseModel):
    plan_id: str
    billing_interval: str = "monthly"
    origin_url: str = ""


class DocumentCheckoutRequest(BaseModel):
    origin_url: str
    quantity: int = Field(1, ge=1, le=20)


class BillingPortalRequest(BaseModel):
    origin_url: str


class CancelSubscriptionRequest(BaseModel):
    reason: str = ""
    feedback: str = ""


# ---- Admin: impersonation & password reset ----
class ImpersonateVerify(BaseModel):
    request_id: str
    otp: str


class SendReset(BaseModel):
    base_url: Optional[str] = None


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(min_length=8)



# ---- Admin: billing/refunds ----
class RefundRequest(BaseModel):
    amount: Optional[float] = None  # if None -> full refund
    reason: Optional[str] = None    # admin-supplied note
    downgrade_plan: Optional[bool] = True  # also downgrade user to free


# ---- Teams & shared templates ----
class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class TeamInviteCreate(BaseModel):
    email: EmailStr


class TemplateShareUpdate(BaseModel):
    shared_with_team: Optional[bool] = None


# ---- Comments / collaboration ----
class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    page: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    parent_id: Optional[str] = None


# ---- Custom branding ----
class BrandingUpdate(BaseModel):
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    banner_text: Optional[str] = None
    # logo is uploaded via multipart, not this model

