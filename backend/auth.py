"""Authentication for CIVICSIGN: email/password (JWT) + Emergent Google OAuth.
Both flows converge on the same JWT cookie session so the rest of the app uses a
single `get_current_user` dependency.
"""
import os
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response as FastResponse

import email_service
from db import db, delete_file, upload_file, download_file
from models import (
    RegisterRequest, LoginRequest, GoogleSessionRequest,
    ProfileUpdate, PasswordChange, SubscriptionUpdate, AccountDelete,
    ResetPassword, VerifyEmail, ResendVerification, ForgotPassword,
)

logger = logging.getLogger("civicsign.auth")

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 24       # 1 day access
REFRESH_TTL_DAYS = 7
PLANS = {"free", "pro", "business"}
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_TTL_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response):
    # Cookie deletion must match the attributes used when setting the cookie
    # (samesite/secure/path) — otherwise modern browsers ignore the Set-Cookie
    # and the session survives logout, bouncing the user straight back in.
    response.delete_cookie("access_token", path="/", samesite="none", secure=True)
    response.delete_cookie("refresh_token", path="/", samesite="none", secure=True)


def _public_user(doc: dict) -> dict:
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture"),
        "mobile": doc.get("mobile"),
        "auth_provider": doc.get("auth_provider", "password"),
        "role": doc.get("role", "user"),
        "permissions": doc.get("permissions", []),
        "plan": doc.get("plan", "free"),
        "active": doc.get("active", True),
        "email_verified": doc.get("email_verified", True),
        "created_at": doc.get("created_at"),
        # ---- Extended business profile (UK-friendly defaults) ----
        "company": doc.get("company", ""),
        "job_title": doc.get("job_title", ""),
        "phone": doc.get("phone", ""),
        "country": doc.get("country", "United Kingdom"),
        "city": doc.get("city", ""),
        "postcode": doc.get("postcode", ""),
        "vat_number": doc.get("vat_number", ""),
        "company_size": doc.get("company_size", ""),
        "industry": doc.get("industry", ""),
        "timezone": doc.get("timezone", "Europe/London"),
        "marketing_opt_in": doc.get("marketing_opt_in", False),
    }


VERIFY_TTL_MIN = 15


async def _issue_verification_code(user_id: str, email: str, name: str = "") -> str:
    """Create/replace a 6-digit email verification code (valid 15 min) and send it."""
    code = f"{secrets.randbelow(900000) + 100000}"
    await db.email_verifications.update_one(
        {"email": email},
        {"$set": {
            "user_id": user_id, "email": email, "code": code, "attempts": 0,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=VERIFY_TTL_MIN)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    status = email_service.send_verification_code(email, name, code)
    logger.info(f"Verification code for {email}: {code} (email_status={status})")
    return code


def _verification_response(email: str, code: str) -> dict:
    """In skip-mode (no SendGrid) surface the code so the user can complete signup."""
    dev = not email_service.is_configured()
    return {
        "verification_required": True,
        "email": email,
        "dev_mode": dev,
        "dev_code": code if dev else None,
        "message": "We sent a 6-digit verification code to your email.",
    }


async def get_current_user(request: Request) -> dict:
    # The Authorization: Bearer header takes precedence over the session cookie so
    # an admin can supply an impersonation token that overrides their own cookie.
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_admin_or_staff(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Internal team access required")
    return user


def require_permission(perm: str):
    """Dependency factory: allow admins unconditionally; allow staff if the
    given permission is in their grant list. Used for permission-scoped admin
    endpoints (e.g. blog, contacts, users-read)."""
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role")
        if role == "admin":
            return user
        if role == "staff" and perm in (user.get("permissions") or []):
            return user
        raise HTTPException(
            status_code=403,
            detail=f"This action requires the '{perm}' permission.",
        )
    return _dep


auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        # Allow resuming an unverified signup; block verified accounts.
        if existing.get("email_verified", True):
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"name": body.name.strip(),
                      "password_hash": hash_password(body.password),
                      "updated_at": datetime.now(timezone.utc).isoformat()}})
        code = await _issue_verification_code(existing["user_id"], email, body.name.strip())
        return _verification_response(email, code)

    user_id = f"user_{uuid.uuid4().hex[:16]}"
    doc = {
        "user_id": user_id, "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "picture": None,
        "mobile": None, "auth_provider": "password",
        "role": "user", "plan": "free", "active": True, "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    code = await _issue_verification_code(user_id, email, body.name.strip())
    # No session is issued until the email is verified.
    return _verification_response(email, code)


@auth_router.post("/verify-email")
async def verify_email(body: VerifyEmail, response: Response):
    email = body.email.lower().strip()
    rec = await db.email_verifications.find_one({"email": email})
    if not rec:
        raise HTTPException(status_code=400, detail="No pending verification for this email. Please sign up again.")
    try:
        expired = datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc)
    except Exception:
        expired = True
    if expired:
        raise HTTPException(status_code=400, detail="This code has expired. Request a new one.")
    if (body.code or "").strip() != rec["code"]:
        await db.email_verifications.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect verification code")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()}})
    await db.email_verifications.delete_one({"email": email})

    # Welcome email (best-effort; skip-mode logs only)
    try:
        email_service.send_welcome(email, user.get("name"))
    except Exception as e:
        logger.warning(f"welcome email failed: {e}")

    user["email_verified"] = True
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh)
    logger.info(f"Email verified for {email}")
    return {"user": _public_user(user), "access_token": access}


@auth_router.post("/resend-verification")
async def resend_verification(body: ResendVerification):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email")
    if user.get("email_verified", True):
        raise HTTPException(status_code=400, detail="This email is already verified. Please sign in.")
    code = await _issue_verification_code(user["user_id"], email, user.get("name", ""))
    return _verification_response(email, code)


@auth_router.post("/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
    if user.get("email_verified", True) is False:
        raise HTTPException(status_code=403, detail="Please verify your email address to continue. We can send you a new code.")
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh)
    return {"user": _public_user(user), "access_token": access}


@auth_router.post("/session")
async def google_session(body: GoogleSessionRequest, response: Response):
    """Exchange an Emergent OAuth session_id for user data, then mint our own JWT."""
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.error(f"Google session exchange failed: {e}")
        raise HTTPException(status_code=401, detail="Google authentication failed")

    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:16]}"
        user = {
            "user_id": user_id, "email": email, "name": data.get("name", ""),
            "password_hash": None, "picture": data.get("picture"),
            "mobile": None, "auth_provider": "google",
            "role": "user", "plan": "free", "active": True, "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"picture": data.get("picture") or user.get("picture"),
                      "name": user.get("name") or data.get("name", ""),
                      "email_verified": True}},
        )
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh)
    return {"user": _public_user(user), "access_token": access}


@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["user_id"], user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/")
    return {"access_token": access}


@auth_router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@auth_router.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update the current user's profile — name, contact, and extended business details."""
    updates = {}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.mobile is not None:
        updates["mobile"] = body.mobile.strip()
    if body.email is not None:
        new_email = body.email.lower().strip()
        if new_email != user["email"]:
            existing = await db.users.find_one({"email": new_email})
            if existing:
                raise HTTPException(status_code=400, detail="That email is already in use by another account")
            updates["email"] = new_email
    # Extended business profile fields
    for fld in ("company", "job_title", "phone", "country", "city", "postcode",
                "vat_number", "company_size", "industry", "timezone"):
        val = getattr(body, fld, None)
        if val is not None:
            updates[fld] = val.strip() if isinstance(val, str) else val
    if body.marketing_opt_in is not None:
        updates["marketing_opt_in"] = bool(body.marketing_opt_in)
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return _public_user(fresh)


@auth_router.post("/change-password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    if not user.get("password_hash"):
        raise HTTPException(status_code=400,
                            detail="Your account uses Google sign-in, so there is no password to change.")
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Your current password is incorrect")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(body.new_password),
                  "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "message": "Password updated"}


@auth_router.post("/subscription")
async def update_subscription(body: SubscriptionUpdate, user: dict = Depends(get_current_user)):
    plan = (body.plan or "").lower().strip()
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Unknown plan")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"plan": plan, "plan_updated_at": datetime.now(timezone.utc).isoformat()}})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return _public_user(fresh)


@auth_router.delete("/account")
async def delete_account(body: AccountDelete, response: Response,
                         user: dict = Depends(get_current_user)):
    """Permanently delete the current user's account and ALL of their data
    (envelopes, templates and stored documents). Requires typed confirmation."""
    if (body.confirm or "").strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail='Type "DELETE" to confirm account deletion')

    uid = user["user_id"]
    # Delete envelope documents from GridFS, then the envelopes
    envs = await db.envelopes.find(
        {"owner_id": uid}, {"_id": 0, "document": 1, "completed_file_id": 1}).to_list(10000)
    for e in envs:
        try:
            fid = (e.get("document") or {}).get("file_id")
            if fid:
                await delete_file(fid)
            if e.get("completed_file_id"):
                await delete_file(e["completed_file_id"])
        except Exception:
            pass
    await db.envelopes.delete_many({"owner_id": uid})

    # Delete user-owned template documents, then templates (never sample templates)
    tpls = await db.templates.find(
        {"owner_id": uid}, {"_id": 0, "document": 1}).to_list(5000)
    for t in tpls:
        try:
            fid = (t.get("document") or {}).get("file_id")
            if fid:
                await delete_file(fid)
        except Exception:
            pass
    await db.templates.delete_many({"owner_id": uid})

    await db.users.delete_one({"user_id": uid})
    clear_auth_cookies(response)
    logger.info(f"Account deleted: {user.get('email')}")
    return {"ok": True, "message": "Your account and all associated data have been deleted."}


@auth_router.post("/forgot-password")
async def forgot_password(body: ForgotPassword):
    """Self-service: generate a reset link for an email. Emails it when SendGrid is
    configured; in skip-mode the link is returned so the user can proceed."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Generic response to avoid email enumeration when nothing can be done.
    generic = {"ok": True, "dev_mode": not email_service.is_configured(), "dev_link": None,
               "message": "If an account exists for that email, a reset link is on its way."}
    if not user:
        return generic
    if not user.get("password_hash") and user.get("auth_provider") == "google":
        # Google accounts have no password; nothing to reset.
        return generic

    token = await create_password_reset(user["user_id"])
    base = (body.base_url or "").rstrip("/")
    reset_link = f"{base}/reset-password?token={token}"
    status = email_service.send_password_reset(email, user.get("name"), reset_link)
    dev = not email_service.is_configured()
    return {"ok": True, "dev_mode": dev, "dev_link": reset_link if dev else None,
            "emailed": status == "sent",
            "message": "If an account exists for that email, a reset link is on its way."}


async def create_password_reset(user_id: str) -> str:
    """Create a one-time password-reset token (valid 1 hour)."""
    token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "token": token, "user_id": user_id, "used": False,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


async def _valid_reset(token: str) -> dict:
    rec = await db.password_resets.find_one({"token": token}, {"_id": 0})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has already been used")
    try:
        expired = datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc)
    except Exception:
        expired = True
    if expired:
        raise HTTPException(status_code=400, detail="This reset link has expired. Ask an admin for a new one.")
    return rec


@auth_router.get("/reset-info")
async def reset_info(token: str):
    rec = await _valid_reset(token)
    user = await db.users.find_one({"user_id": rec["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"email": user["email"], "name": user.get("name", "")}


@auth_router.post("/reset-password")
async def reset_password(body: ResetPassword):
    rec = await _valid_reset(body.token)
    await db.users.update_one(
        {"user_id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(body.new_password),
                  "updated_at": datetime.now(timezone.utc).isoformat()}})
    await db.password_resets.update_one({"token": body.token}, {"$set": {"used": True}})
    logger.info(f"Password reset completed for user {rec['user_id']}")
    return {"ok": True, "message": "Your password has been reset. You can now sign in."}


# ---- Avatar upload ------------------------------------------------------
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


@auth_router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload (or replace) the current user's avatar image. Stored in GridFS and
    served via GET /api/auth/avatar/{file_id}."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WebP or GIF image")
    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image too large — keep it under 2 MB")
    if len(data) < 64:
        raise HTTPException(status_code=400, detail="File looks empty or corrupt")
    file_id = await upload_file(data, f"avatar_{user['user_id']}", content_type=file.content_type)
    picture_url = f"/api/auth/avatar/{file_id}"
    # Clean up previous internally-hosted avatar (best effort)
    old = (user.get("picture") or "")
    if old.startswith("/api/auth/avatar/"):
        try:
            await delete_file(old.rsplit("/", 1)[-1])
        except Exception:
            pass
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": picture_url,
                  "avatar_content_type": file.content_type,
                  "updated_at": datetime.now(timezone.utc).isoformat()}})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return _public_user(fresh)


@auth_router.delete("/avatar")
async def delete_avatar(user: dict = Depends(get_current_user)):
    old = user.get("picture") or ""
    if old.startswith("/api/auth/avatar/"):
        try:
            await delete_file(old.rsplit("/", 1)[-1])
        except Exception:
            pass
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": None, "avatar_content_type": None,
                  "updated_at": datetime.now(timezone.utc).isoformat()}})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return _public_user(fresh)


@auth_router.get("/avatar/{file_id}")
async def get_avatar(file_id: str):
    """Public avatar fetch — embedded in <img> tags so it does not require a session."""
    try:
        data = await download_file(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Avatar not found")
    # Look up the matching user to get the original content-type
    user = await db.users.find_one({"picture": f"/api/auth/avatar/{file_id}"},
                                   {"_id": 0, "avatar_content_type": 1})
    ctype = (user or {}).get("avatar_content_type") or "image/jpeg"
    return FastResponse(content=data, media_type=ctype,
                        headers={"Cache-Control": "public, max-age=300"})


async def seed_admin():
    """Seed a demo sender + an internal admin account, and backfill account defaults."""
    # Backfill defaults for any pre-existing users
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})
    await db.users.update_many({"plan": {"$exists": False}}, {"$set": {"plan": "free"}})
    await db.users.update_many({"active": {"$exists": False}}, {"$set": {"active": True}})
    await db.users.update_many({"mobile": {"$exists": False}}, {"$set": {"mobile": None}})
    # Existing accounts predate email verification — grandfather them as verified.
    await db.users.update_many({"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}})

    # Demo sender account (regular user)
    email = os.environ.get("ADMIN_EMAIL", "user@civicsign.app").lower()
    password = os.environ.get("ADMIN_PASSWORD", "Welcome@2026!")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:16]}", "email": email,
            "name": "CivicSign Demo", "password_hash": hash_password(password),
            "picture": None, "mobile": None, "auth_provider": "password",
            "role": "user", "plan": "pro", "active": True, "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded demo account {email}")
    elif not verify_password(password, existing.get("password_hash") or ""):
        await db.users.update_one({"email": email},
                                  {"$set": {"password_hash": hash_password(password)}})

    # Internal admin account (role=admin)
    admin_email = os.environ.get("INTERNAL_ADMIN_EMAIL", "admin@civicsign.app").lower()
    admin_password = os.environ.get("INTERNAL_ADMIN_PASSWORD", "Admin@2026!")
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:16]}", "email": admin_email,
            "name": "CivicSign Admin", "password_hash": hash_password(admin_password),
            "picture": None, "mobile": None, "auth_provider": "password",
            "role": "admin", "plan": "business", "active": True, "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded internal admin account {admin_email}")
    else:
        patch = {"role": "admin", "active": True, "email_verified": True}
        if not verify_password(admin_password, admin.get("password_hash") or ""):
            patch["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": patch})
