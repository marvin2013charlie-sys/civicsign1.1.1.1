"""Authentication for CivicSign: email/password (JWT).
All sessions use the same JWT cookie so the rest of the app relies on a
single `get_current_user` dependency.

SECURITY HARDENING:
- Strong password requirements
- CSRF protection via SameSite cookies
- JWT secret validation
- Password hashing with bcrypt
- Email verification mandatory
- Rate limiting on auth endpoints
- Brute force protection
- Secure cookie handling
"""
import os
import uuid
import secrets
import logging
import re
import hmac
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from pymongo import ReturnDocument
from fastapi import APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import Response as FastResponse
from rate_limits import limiter, auth_limit

import email_service
from plan_signing import get_effective_plan, generate_plan_signature
from db import db, delete_file, upload_file, download_file
from security_utils import is_dev_mode, validate_redirect_base, cookie_secure, sniff_image_type
from plan_features import plan_features
from models import (
    RegisterRequest, LoginRequest,
    ProfileUpdate, PasswordChange, SubscriptionUpdate, AccountDelete,
    ResetPassword, VerifyEmail, ResendVerification, ForgotPassword, EmailChangeRequest,
)

logger = logging.getLogger("civicsign.auth")

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 24       # 1 day access
REFRESH_TTL_DAYS = 7
PLANS = {"free", "pro", "business"}

# Password validation constants: minimum 8 chars with at least one capital
# letter, one digit and one special character (mandatory).
MIN_PASSWORD_LENGTH = 8
PASSWORD_PATTERN = re.compile(
    r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{" + str(MIN_PASSWORD_LENGTH) + ",}$"
)
PASSWORD_HELP_TEXT = (
    "Password must be at least 8 characters and contain at least "
    "1 capital letter, 1 number and 1 special character"
)

MAX_VERIFY_ATTEMPTS = 5


def get_jwt_secret() -> str:
    """Get JWT secret from environment with validation."""
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is not set")
    # Validate secret strength (min 32 chars)
    if len(secret) < 32:
        logger.error("JWT_SECRET is too short (min 32 chars) - using weak secret is dangerous!")
        raise RuntimeError("JWT_SECRET must be at least 32 characters")
    return secret


def _validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements."""
    if not password:
        return False, "Password is required"
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    if not PASSWORD_PATTERN.match(password):
        return False, PASSWORD_HELP_TEXT
    return True, ""


def hash_password(password: str) -> str:
    """Hash password using bcrypt with strong settings."""
    # Use bcrypt with cost 12 (more secure than default 10)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password using bcrypt."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    user_id: str,
    email: str,
    *,
    token_version: int = 0,
    impersonating: bool = False,
) -> str:
    """Create JWT access token with strict validation."""
    if not user_id or not email:
        raise ValueError("user_id and email are required")

    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "tv": int(token_version or 0),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "iat": datetime.now(timezone.utc),
    }
    if impersonating:
        payload["imp"] = True
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, *, token_version: int = 0) -> str:
    """Create JWT refresh token."""
    if not user_id:
        raise ValueError("user_id is required")

    payload = {
        "sub": user_id,
        "type": "refresh",
        "tv": int(token_version or 0),
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    """Set authentication cookies with security flags."""
    secure = cookie_secure()
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=secure,
        samesite="strict",
        max_age=ACCESS_TTL_MIN * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=secure,
        samesite="strict",
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )


def clear_auth_cookies(response: Response):
    """Clear authentication cookies securely."""
    secure = cookie_secure()
    response.delete_cookie("access_token", path="/", samesite="strict", secure=secure)
    response.delete_cookie("refresh_token", path="/", samesite="strict", secure=secure)


def _public_user(doc: dict) -> dict:
    """Return safe user object for API responses (no secrets)."""
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture"),
        "mobile": doc.get("mobile"),
        "auth_provider": doc.get("auth_provider", "password"),
        "role": doc.get("role", "user"),
        "permissions": doc.get("permissions", []),
        "plan": get_effective_plan(doc),
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
        "org_id": doc.get("org_id"),
        "org_role": doc.get("org_role"),
        "extra_document_credits": max(0, int(doc.get("extra_document_credits") or 0)),
        "plan_features": plan_features(doc),
    }


VERIFY_TTL_MIN = 15


async def _fulfill_team_invites(email: str, user_id: str, name: str) -> None:
    """Add the user to any teams that invited them before signup."""
    invites = await db.team_invites.find(
        {"email": email.lower()}, {"_id": 0}).to_list(50)
    for inv in invites:
        team_id = inv.get("team_id")
        if not team_id:
            continue
        team = await db.teams.find_one({"team_id": team_id}, {"_id": 0, "members": 1})
        if not team:
            await db.team_invites.delete_many({"team_id": team_id, "email": email.lower()})
            continue
        if any(m.get("user_id") == user_id for m in team.get("members", [])):
            await db.team_invites.delete_many({"team_id": team_id, "email": email.lower()})
            continue
        member = {
            "user_id": user_id,
            "email": email.lower(),
            "name": name or email,
            "role": "member",
            "added_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.teams.update_one({"team_id": team_id}, {"$push": {"members": member}})
        await db.team_invites.delete_many({"team_id": team_id, "email": email.lower()})


async def _issue_verification_code(user_id: str, email: str, name: str = "") -> str:
    """Create/replace a 6-digit email verification code (valid 15 min) and send it."""
    code = f"{secrets.randbelow(900000) + 100000}"
    _exp_dt = datetime.now(timezone.utc) + timedelta(minutes=VERIFY_TTL_MIN)
    await db.email_verifications.update_one(
        {"email": email},
        {"$set": {
            "user_id": user_id,
            "email": email,
            "code": code,
            "attempts": 0,
            "expires_at": _exp_dt.isoformat(),
            # Real BSON date for the TTL index (auto-purges stale codes).
            "expire_at": _exp_dt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    status = email_service.send_verification_code(email, name, code)
    logger.info(f"[auth] Verification code issued for {email} (email_status={status})")
    return code


def _verification_response(email: str, code: str) -> dict:
    """In explicit DEV_MODE only, surface the code for local testing."""
    dev = is_dev_mode()
    return {
        "verification_required": True,
        "email": email,
        "dev_mode": dev,
        "dev_code": code if dev else None,
        "message": (
            "Your verification code is shown on screen (dev mode)."
            if dev
            else "We sent a 6-digit verification code to your email."
        ),
    }


def _access_token_from_request(request: Request, query_token: str | None = None) -> str | None:
    """Bearer header → query param (SSE) → HttpOnly cookie."""
    token = (query_token or "").strip() or None
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if not token:
        token = request.cookies.get("access_token")
    return token or None


async def user_from_access_token(token: str) -> dict:
    """Validate a JWT access token and return the user document."""
    if len(token) > 2048:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token claims")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"[auth] Invalid token: {str(e)[:50]}")
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token_tv = int(payload.get("tv") or 0)
    user_tv = int(user.get("token_version") or 0)
    if token_tv != user_tv:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated")
    if user.get("email_verified", True) is False and user.get("role", "user") == "user":
        raise HTTPException(status_code=403, detail="Please verify your email address to continue")
    user["_impersonating"] = bool(payload.get("imp"))
    return user


async def get_current_user(request: Request) -> dict:
    """Extract and validate current user from JWT."""
    token = _access_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await user_from_access_token(token)


async def get_current_user_sse(
    request: Request,
    access_token: str | None = Query(None),
) -> dict:
    """Auth for EventSource streams — accepts ?access_token= when Bearer is unavailable."""
    token = _access_token_from_request(request, query_token=access_token)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await user_from_access_token(token)


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
    given permission is in their grant list."""
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
@limiter.limit("5/hour")
async def register(request: Request, body: RegisterRequest, response: Response):
    """Register new user with email verification."""
    try:
        # Validate email format
        email = body.email.lower().strip()
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        if len(email) > 255:
            raise HTTPException(status_code=400, detail="Email too long")
        
        # Validate name
        name = body.name.strip()
        if not name or len(name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        if len(name) > 100:
            raise HTTPException(status_code=400, detail="Name too long")
        
        # Validate password strength
        is_valid, error = _validate_password_strength(body.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        existing = await db.users.find_one({"email": email})
        if existing:
            # Allow resuming an unverified signup; block verified accounts.
            if existing.get("email_verified", True):
                raise HTTPException(status_code=400, detail="An account with this email already exists")
            # Update unverified account
            await db.users.update_one(
                {"user_id": existing["user_id"]},
                {"$set": {
                    "name": name,
                    "password_hash": hash_password(body.password),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            code = await _issue_verification_code(existing["user_id"], email, name)
            return _verification_response(email, code)

        user_id = f"user_{uuid.uuid4().hex[:16]}"
        doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": hash_password(body.password),
            "picture": None,
            "mobile": None,
            "auth_provider": "password",
            "role": "user",
            "plan": "free",
            "active": True,
            "email_verified": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        code = await _issue_verification_code(user_id, email, name)
        logger.info(f"[auth] New user registered: {email}")
        # No session is issued until the email is verified.
        return _verification_response(email, code)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] register error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Registration failed")


@auth_router.post("/verify-email")
@limiter.limit("10/hour")
async def verify_email(request: Request, body: VerifyEmail, response: Response):
    """Verify email with one-time code."""
    try:
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

        if rec.get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
            await db.email_verifications.delete_one({"email": email})
            raise HTTPException(
                status_code=429,
                detail="Too many incorrect attempts. Request a new verification code.",
            )
        
        # Use constant-time comparison to prevent timing attacks
        provided_code = (body.code or "").strip()
        if len(provided_code) != 6 or not provided_code.isdigit():
            await db.email_verifications.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(status_code=400, detail="Incorrect verification code")
        
        if not hmac.compare_digest(provided_code, rec["code"]):
            updated = await db.email_verifications.find_one_and_update(
                {"email": email},
                {"$inc": {"attempts": 1}},
                return_document=ReturnDocument.AFTER,
            )
            if (updated or {}).get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
                await db.email_verifications.delete_one({"email": email})
                raise HTTPException(
                    status_code=429,
                    detail="Too many incorrect attempts. Request a new verification code.",
                )
            raise HTTPException(status_code=400, detail="Incorrect verification code")

        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")

        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"email_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.email_verifications.delete_one({"email": email})
        await _fulfill_team_invites(email, user["user_id"], user.get("name", ""))

        # Welcome email (best-effort; skip-mode logs only)
        try:
            email_service.send_welcome(email, user.get("name"))
        except Exception as e:
            logger.warning(f"[auth] welcome email failed: {e}")

        user["email_verified"] = True
        tv = int(user.get("token_version") or 0)
        access = create_access_token(user["user_id"], email, token_version=tv)
        refresh = create_refresh_token(user["user_id"], token_version=tv)
        set_auth_cookies(response, access, refresh)
        logger.info(f"[auth] Email verified: {email}")
        return {"user": _public_user(user), "access_token": access}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] verify_email error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Email verification failed")


@auth_router.post("/resend-verification")
@limiter.limit("3/hour")
async def resend_verification(request: Request, body: ResendVerification):
    """Resend verification code to email."""
    try:
        email = body.email.lower().strip()
        user = await db.users.find_one({"email": email})
        if not user:
            # Don't leak whether email exists
            return {"ok": True, "message": "If an account exists, we sent a verification code."}
        if user.get("email_verified", True):
            raise HTTPException(status_code=400, detail="This email is already verified. Please sign in.")
        code = await _issue_verification_code(user["user_id"], email, user.get("name", ""))
        return _verification_response(email, code)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] resend_verification error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to resend verification code")


@auth_router.post("/login")
@limiter.limit(auth_limit("10/hour"))
async def login(request: Request, body: LoginRequest, response: Response):
    """Authenticate user with email and password."""
    try:
        email = body.email.lower().strip()

        user = await db.users.find_one({"email": email})
        if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
            logger.warning(f"[auth] Failed login attempt: {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if user.get("active") is False:
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
        if user.get("email_verified", True) is False:
            raise HTTPException(status_code=403, detail="Please verify your email address to continue. We can send you a new code.")
        
        tv = int(user.get("token_version") or 0)
        access = create_access_token(user["user_id"], email, token_version=tv)
        refresh = create_refresh_token(user["user_id"], token_version=tv)
        set_auth_cookies(response, access, refresh)
        logger.info(f"[auth] Login successful: {email}")
        return {"user": _public_user(user), "access_token": access}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] login error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Login failed")


@auth_router.post("/request-email-change")
@limiter.limit("3/hour")
async def request_email_change(request: Request, body: EmailChangeRequest,
                               user: dict = Depends(get_current_user)):
    """Start a verified email change — code is sent to the new address."""
    new_email = body.email.lower().strip()
    if new_email == user["email"]:
        raise HTTPException(status_code=400, detail="That is already your email address")
    existing = await db.users.find_one({"email": new_email})
    if existing:
        raise HTTPException(status_code=400, detail="That email is already in use by another account")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"pending_email": new_email, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _issue_verification_code(user["user_id"], new_email, user.get("name", ""))
    return {"ok": True, "message": f"We sent a verification code to {new_email}"}


@auth_router.post("/confirm-email-change")
@limiter.limit("10/hour")
async def confirm_email_change(request: Request, body: VerifyEmail,
                               user: dict = Depends(get_current_user)):
    """Complete a pending email change after verifying the new address."""
    new_email = body.email.lower().strip()
    if user.get("pending_email") != new_email:
        raise HTTPException(status_code=400, detail="No pending email change for this address")
    rec = await db.email_verifications.find_one({"email": new_email})
    if not rec:
        raise HTTPException(status_code=400, detail="No verification code found. Request a new one.")
    try:
        expired = datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc)
    except Exception:
        expired = True
    if expired:
        raise HTTPException(status_code=400, detail="This code has expired. Request a new one.")
    if rec.get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
        await db.email_verifications.delete_one({"email": new_email})
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Request a new code.")
    provided_code = (body.code or "").strip()
    if len(provided_code) != 6 or not provided_code.isdigit():
        await db.email_verifications.update_one({"email": new_email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Incorrect verification code")
    if not hmac.compare_digest(provided_code, rec["code"]):
        updated = await db.email_verifications.find_one_and_update(
            {"email": new_email},
            {"$inc": {"attempts": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if (updated or {}).get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
            await db.email_verifications.delete_one({"email": new_email})
            raise HTTPException(status_code=429, detail="Too many incorrect attempts. Request a new code.")
        raise HTTPException(status_code=400, detail="Incorrect verification code")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "email": new_email,
            "pending_email": None,
            "email_verified": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await db.email_verifications.delete_one({"email": new_email})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    logger.info(f"[auth] Email changed for user {user['user_id']} -> {new_email}")
    return _public_user(fresh)


@auth_router.post("/refresh")
@limiter.limit("30/hour")
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh token."""
    try:
        token = request.cookies.get("refresh_token")
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token")
        
        if len(token) > 2048:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        try:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token type")
        except jwt.InvalidTokenError as e:
            logger.warning(f"[auth] Invalid refresh token: {str(e)[:50]}")
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        token_tv = int(payload.get("tv") or 0)
        user_tv = int(user.get("token_version") or 0)
        if token_tv != user_tv:
            raise HTTPException(status_code=401, detail="Session expired — please sign in again")

        access = create_access_token(
            user["user_id"], user["email"], token_version=user_tv,
        )
        new_refresh = create_refresh_token(user["user_id"], token_version=user_tv)
        set_auth_cookies(response, access, new_refresh)
        return {"access_token": access}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] refresh_token error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Token refresh failed")


@auth_router.post("/logout")
async def logout(response: Response):
    """Clear authentication session."""
    clear_auth_cookies(response)
    logger.info("[auth] User logged out")
    return {"ok": True}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Get current user profile."""
    out = _public_user(user)
    if not out.get("org_role") and out.get("org_id"):
        org = await db.organizations.find_one(
            {"org_id": out["org_id"]}, {"owner_user_id": 1, "_id": 0},
        )
        if org and org.get("owner_user_id") == out["user_id"]:
            out["org_role"] = "owner"
    if user.get("_impersonating"):
        out["impersonating_session"] = True
        out["document_access_restricted"] = True
    return out


@auth_router.put("/profile")
@limiter.limit("20/hour")
async def update_profile(request: Request, body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update the current user's profile — name, contact, and extended business details."""
    try:
        updates = {}
        
        if body.name is not None:
            name = body.name.strip()
            if not name or len(name) < 2:
                raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
            if len(name) > 100:
                raise HTTPException(status_code=400, detail="Name too long")
            updates["name"] = name
        
        if body.mobile is not None:
            mobile = body.mobile.strip()
            if len(mobile) > 20:
                raise HTTPException(status_code=400, detail="Mobile too long")
            updates["mobile"] = mobile
        
        if body.email is not None:
            new_email = body.email.lower().strip()
            if new_email != user["email"]:
                raise HTTPException(
                    status_code=400,
                    detail="Email changes require verification. Use POST /api/auth/request-email-change.",
                )
        
        # Extended business profile fields
        for fld in ("company", "job_title", "phone", "country", "city", "postcode",
                    "vat_number", "company_size", "industry", "timezone"):
            val = getattr(body, fld, None)
            if val is not None:
                if isinstance(val, str):
                    if len(val) > 100:
                        raise HTTPException(status_code=400, detail=f"{fld} too long")
                    updates[fld] = val.strip()
                else:
                    updates[fld] = val
        
        if body.marketing_opt_in is not None:
            updates["marketing_opt_in"] = bool(body.marketing_opt_in)
        
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
        
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        logger.info(f"[auth] Profile updated: {user['email']}")
        return _public_user(fresh)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] update_profile error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@auth_router.post("/change-password")
@limiter.limit("5/hour")
async def change_password(request: Request, body: PasswordChange, user: dict = Depends(get_current_user)):
    """Change user password."""
    try:
        if not user.get("password_hash"):
            raise HTTPException(
                status_code=400,
                detail="Your account uses Google sign-in, so there is no password to change."
            )
        
        if not verify_password(body.current_password, user["password_hash"]):
            logger.warning(f"[auth] Incorrect current password for: {user['email']}")
            raise HTTPException(status_code=400, detail="Your current password is incorrect")
        
        # Validate new password strength
        is_valid, error = _validate_password_strength(body.new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "password_hash": hash_password(body.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, "$inc": {"token_version": 1}},
        )
        await db.password_resets.update_many(
            {"user_id": user["user_id"], "used": False},
            {"$set": {"used": True}},
        )
        logger.info(f"[auth] Password changed: {user['email']}")
        return {"ok": True, "message": "Password updated. Other sessions have been signed out."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] change_password error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to change password")


@auth_router.post("/subscription")
@limiter.limit("10/hour")
async def update_subscription(request: Request, body: SubscriptionUpdate, user: dict = Depends(get_current_user)):
    """Update user subscription plan (only for downgrading)."""
    try:
        plan = (body.plan or "").lower().strip()
        if plan not in PLANS:
            raise HTTPException(status_code=400, detail="Unknown plan")
        
        current_plan = user.get("plan", "free")
        if plan == current_plan:
            raise HTTPException(status_code=400, detail=f"You are already on the {plan} plan")
        
        # Only allow downgrades from user side (upgrades via billing system)
        plan_order = {"free": 0, "pro": 1, "business": 2}
        if plan_order.get(plan, 0) > plan_order.get(current_plan, 0):
            raise HTTPException(
                status_code=400,
                detail="Use the billing system to upgrade your plan"
            )
        
        patch = {
            "plan": plan,
            "plan_updated_at": datetime.now(timezone.utc).isoformat(),
            "plan_signature": None,
            "plan_upgraded_via_payment": False,
        }
        if plan == "free":
            patch["monthly_envelope_limit"] = None
            patch["enterprise_unlimited"] = False
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        logger.info(f"[auth] Plan downgraded: {user['email']} from {current_plan} to {plan}")
        return _public_user(fresh)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] update_subscription error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to update subscription")


@auth_router.delete("/account")
@limiter.limit("1/hour")
async def delete_account(request: Request, body: AccountDelete, response: Response,
                         user: dict = Depends(get_current_user)):
    """
    Permanently delete the current user's account and ALL of their data
    (envelopes, templates and stored documents). Requires typed confirmation.
    """
    try:
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

        # Delete user-owned template documents, then templates
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
        logger.warning(f"[auth] Account deleted: {user.get('email')}")
        return {"ok": True, "message": "Your account and all associated data have been deleted."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] delete_account error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to delete account")


@auth_router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, body: ForgotPassword):
    """Self-service: generate a reset link for an email."""
    try:
        email = body.email.lower().strip()
        user = await db.users.find_one({"email": email})
        # Generic response to avoid email enumeration
        generic = {
            "ok": True,
            "dev_mode": is_dev_mode(),
            "dev_link": None,
            "message": "If an account exists for that email, a reset link is on its way."
        }
        if not user:
            return generic
        if not user.get("password_hash") and user.get("auth_provider") == "google":
            return generic

        token = await create_password_reset(user["user_id"])
        base = validate_redirect_base(body.base_url or "")
        reset_link = f"{base}/reset-password?token={token}"
        status = email_service.send_password_reset(email, user.get("name"), reset_link)
        dev = is_dev_mode()
        logger.info(f"[auth] Password reset requested: {email}")
        return {
            "ok": True,
            "dev_mode": dev,
            "dev_link": reset_link if dev else None,
            "emailed": status == "sent",
            "message": "If an account exists for that email, a reset link is on its way."
        }
    except Exception as e:
        logger.error(f"[auth] forgot_password error: {str(e)[:100]}")
        # Return generic response to avoid leaking info
        return {
            "ok": True,
            "message": "If an account exists for that email, a reset link is on its way."
        }


async def create_password_reset(user_id: str) -> str:
    """Create a one-time password-reset token (valid 1 hour)."""
    token = secrets.token_urlsafe(32)
    _exp_dt = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_resets.insert_one({
        "token": token,
        "user_id": user_id,
        "used": False,
        "expires_at": _exp_dt.isoformat(),
        # Real BSON date for the TTL index (auto-purges used/expired tokens).
        "expire_at": _exp_dt,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


async def _valid_reset(token: str) -> dict:
    """Validate password reset token."""
    if not token or len(token) > 256:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
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
@limiter.limit("10/hour")
async def reset_info(request: Request, token: str):
    """Get reset link info (email and name)."""
    try:
        rec = await _valid_reset(token)
        user = await db.users.find_one({"user_id": rec["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        return {"email": user["email"], "name": user.get("name", "")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] reset_info error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to get reset info")


@auth_router.post("/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, body: ResetPassword):
    """Complete password reset with new password."""
    try:
        rec = await _valid_reset(body.token)
        
        # Validate new password strength
        is_valid, error = _validate_password_strength(body.new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        await db.users.update_one(
            {"user_id": rec["user_id"]},
            {"$set": {
                "password_hash": hash_password(body.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, "$inc": {"token_version": 1}},
        )
        await db.password_resets.update_many(
            {"user_id": rec["user_id"], "used": False},
            {"$set": {"used": True}},
        )
        logger.info(f"[auth] Password reset completed for user {rec['user_id']}")
        return {
            "ok": True,
            "message": "Your password has been reset. Previous sessions have been signed out.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] reset_password error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


# ---- Avatar upload ------------------------------------------------------
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


@auth_router.post("/avatar")
@limiter.limit("10/hour")
async def upload_avatar(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload (or replace) the current user's avatar image."""
    try:
        if file.content_type not in ALLOWED_AVATAR_TYPES:
            raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WebP or GIF image")
        
        data = await file.read()
        if len(data) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=400, detail="Image too large — keep it under 2 MB")
        if len(data) < 64:
            raise HTTPException(status_code=400, detail="File looks empty or corrupt")
        detected = sniff_image_type(data)
        if not detected or detected not in ALLOWED_AVATAR_TYPES:
            raise HTTPException(status_code=400, detail="File content does not match a supported image format")
        
        file_id = await upload_file(data, f"avatar_{user['user_id']}", content_type=detected)
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
            {"$set": {
                "picture": picture_url,
                "avatar_content_type": file.content_type,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        logger.info(f"[auth] Avatar uploaded: {user['email']}")
        return _public_user(fresh)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] upload_avatar error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to upload avatar")


@auth_router.delete("/avatar")
@limiter.limit("10/hour")
async def delete_avatar(request: Request, user: dict = Depends(get_current_user)):
    """Delete user's avatar."""
    try:
        old = user.get("picture") or ""
        if old.startswith("/api/auth/avatar/"):
            try:
                await delete_file(old.rsplit("/", 1)[-1])
            except Exception:
                pass
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "picture": None,
                "avatar_content_type": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        logger.info(f"[auth] Avatar deleted: {user['email']}")
        return _public_user(fresh)
    except Exception as e:
        logger.error(f"[auth] delete_avatar error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Failed to delete avatar")


@auth_router.get("/avatar/{file_id}")
async def get_avatar(file_id: str):
    """Public avatar fetch — only serves files registered as a user's profile picture."""
    try:
        if not file_id or len(file_id) > 100:
            raise HTTPException(status_code=400, detail="Invalid file ID")

        user = await db.users.find_one(
            {"picture": f"/api/auth/avatar/{file_id}"},
            {"_id": 0, "avatar_content_type": 1},
        )
        if not user:
            raise HTTPException(status_code=404, detail="Avatar not found")

        data = await download_file(file_id)
        ctype = user.get("avatar_content_type") or "image/jpeg"
        return FastResponse(
            content=data,
            media_type=ctype,
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        logger.warning(f"[auth] get_avatar error: {str(e)[:100]}")
        raise HTTPException(status_code=404, detail="Avatar not found")


def _parse_internal_admin_accounts():
    """Collect internal admin credentials from env (legacy pair + extra accounts)."""
    accounts = []
    seen = set()

    def add(email, password, name="CivicSign Admin"):
        email = (email or "").lower().strip()
        password = (password or "").strip()
        if not email or not password or email in seen:
            return
        seen.add(email)
        accounts.append((email, password, name))

    add(
        os.environ.get("INTERNAL_ADMIN_EMAIL", ""),
        os.environ.get("INTERNAL_ADMIN_PASSWORD", ""),
    )

    extra = os.environ.get("INTERNAL_ADMIN_ACCOUNTS", "").strip()
    if extra:
        for entry in extra.split(";"):
            entry = entry.strip()
            if not entry:
                continue
            parts = [p.strip() for p in entry.split("|")]
            if len(parts) >= 2:
                add(parts[0], parts[1], parts[2] if len(parts) > 2 else "CivicSign Admin")

    return accounts


async def _seed_internal_admin_account(email, password, name, generate_plan_signature):
    """Insert or refresh a single role=admin account."""
    admin = await db.users.find_one({"email": email})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:16]}",
            "email": email,
            "name": name,
            "password_hash": hash_password(password),
            "picture": None,
            "mobile": None,
            "auth_provider": "password",
            "role": "admin",
            "plan": "business",
            "active": True,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"[auth] Seeded internal admin account {email}")
    else:
        updates = {"role": "admin", "active": True, "email_verified": True, "name": name}
        if is_dev_mode():
            updates["password_hash"] = hash_password(password)
        await db.users.update_one({"email": email}, {"$set": updates})
        logger.info(f"[auth] Ensured internal admin account {email}")

    admin_ref = await db.users.find_one({"email": email})
    if admin_ref and admin_ref.get("plan") == "business" and not admin_ref.get("plan_signature"):
        ts = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "plan_updated_at": ts,
                "plan_signature": generate_plan_signature(
                    admin_ref["user_id"], "business", ts),
                "plan_upgraded_via_payment": True,
            }},
        )


async def seed_admin():
    """Seed a demo sender + internal admin accounts, and backfill account defaults."""
    try:
        # Backfill defaults for any pre-existing users
        await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})
        await db.users.update_many({"plan": {"$exists": False}}, {"$set": {"plan": "free"}})
        await db.users.update_many({"active": {"$exists": False}}, {"$set": {"active": True}})
        await db.users.update_many({"mobile": {"$exists": False}}, {"$set": {"mobile": None}})
        # Existing accounts predate email verification — grandfather them as verified.
        await db.users.update_many({"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}})

        # Demo sender account (regular user) — only seeded when credentials are explicitly set.
        email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
        password = os.environ.get("ADMIN_PASSWORD", "").strip()
        if email and password:
            existing = await db.users.find_one({"email": email})
            if not existing:
                user_id = f"user_{uuid.uuid4().hex[:16]}"
                ts = datetime.now(timezone.utc).isoformat()
                await db.users.insert_one({
                    "user_id": user_id,
                    "email": email,
                    "name": "CivicSign Demo",
                    "password_hash": hash_password(password),
                    "picture": None,
                    "mobile": None,
                    "auth_provider": "password",
                    "role": "user",
                    "plan": "pro",
                    "plan_updated_at": ts,
                    "plan_signature": generate_plan_signature(user_id, "pro", ts),
                    "plan_upgraded_via_payment": True,
                    "active": True,
                    "email_verified": True,
                    "created_at": ts,
                })
                logger.info(f"[auth] Seeded demo account {email}")
            else:
                # Backfill verified Pro signature for dev demo accounts.
                if existing.get("plan") == "pro" and not existing.get("plan_signature"):
                    ts = datetime.now(timezone.utc).isoformat()
                    await db.users.update_one(
                        {"email": email},
                        {"$set": {
                            "plan_updated_at": ts,
                            "plan_signature": generate_plan_signature(
                                existing["user_id"], "pro", ts),
                            "plan_upgraded_via_payment": True,
                        }},
                    )
        elif email or password:
            logger.warning("[auth] ADMIN_EMAIL and ADMIN_PASSWORD must both be set to seed demo account")

        # Internal admin accounts (role=admin).
        admin_accounts = _parse_internal_admin_accounts()
        if admin_accounts:
            for admin_email, admin_password, admin_name in admin_accounts:
                await _seed_internal_admin_account(
                    admin_email,
                    admin_password,
                    admin_name,
                    generate_plan_signature,
                )
        elif (
            os.environ.get("INTERNAL_ADMIN_EMAIL", "").strip()
            or os.environ.get("INTERNAL_ADMIN_PASSWORD", "").strip()
            or os.environ.get("INTERNAL_ADMIN_ACCOUNTS", "").strip()
        ):
            logger.warning(
                "[auth] Internal admin env vars are incomplete — "
                "set INTERNAL_ADMIN_EMAIL + INTERNAL_ADMIN_PASSWORD and/or INTERNAL_ADMIN_ACCOUNTS"
            )
    except Exception as e:
        logger.error(f"[auth] seed_admin error: {str(e)[:100]}")
