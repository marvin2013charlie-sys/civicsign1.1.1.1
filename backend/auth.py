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
from fastapi import APIRouter, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response as FastResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

import email_service
from db import db, delete_file, upload_file, download_file
from models import (
    RegisterRequest, LoginRequest,
    ProfileUpdate, PasswordChange, SubscriptionUpdate, AccountDelete,
    ResetPassword, VerifyEmail, ResendVerification, ForgotPassword,
)

logger = logging.getLogger("civicsign.auth")

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 24       # 1 day access
REFRESH_TTL_DAYS = 7
PLANS = {"free", "pro", "business"}

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

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

# Brute force protection
FAILED_LOGIN_ATTEMPTS = {}  # user_email -> {count: int, locked_until: datetime}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MIN = 15


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


def _is_account_locked(email: str) -> bool:
    """Check if account is locked due to failed login attempts."""
    if email not in FAILED_LOGIN_ATTEMPTS:
        return False
    
    data = FAILED_LOGIN_ATTEMPTS[email]
    if datetime.now(timezone.utc) > data.get("locked_until", datetime.now(timezone.utc)):
        # Lock has expired
        del FAILED_LOGIN_ATTEMPTS[email]
        return False
    
    return True


def _record_failed_login(email: str):
    """Record failed login attempt and lock account if necessary."""
    if email not in FAILED_LOGIN_ATTEMPTS:
        FAILED_LOGIN_ATTEMPTS[email] = {"count": 0, "locked_until": None}
    
    FAILED_LOGIN_ATTEMPTS[email]["count"] += 1
    
    if FAILED_LOGIN_ATTEMPTS[email]["count"] >= MAX_FAILED_ATTEMPTS:
        FAILED_LOGIN_ATTEMPTS[email]["locked_until"] = (
            datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MIN)
        )
        logger.warning(
            f"[auth] Account {email} locked after {MAX_FAILED_ATTEMPTS} failed login attempts"
        )


def _reset_failed_login(email: str):
    """Reset failed login counter on successful login."""
    if email in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[email]


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


def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token with strict validation."""
    if not user_id or not email:
        raise ValueError("user_id and email are required")
    
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token."""
    if not user_id:
        raise ValueError("user_id is required")
    
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    """Set authentication cookies with security flags."""
    response.set_cookie(
        "access_token",
        access,
        httponly=True,  # Prevent JavaScript access
        secure=True,    # HTTPS only
        samesite="strict",  # CSRF protection (strict)
        max_age=ACCESS_TTL_MIN * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )


def clear_auth_cookies(response: Response):
    """Clear authentication cookies securely."""
    # Cookie deletion must match the attributes used when setting the cookie
    response.delete_cookie("access_token", path="/", samesite="strict", secure=True)
    response.delete_cookie("refresh_token", path="/", samesite="strict", secure=True)


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
    """Extract and validate current user from JWT."""
    # The Authorization: Bearer header takes precedence over the session cookie
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate token length (prevent DoS)
    if len(token) > 2048:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        # Validate required claims
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
        
        # Use constant-time comparison to prevent timing attacks
        provided_code = (body.code or "").strip()
        if len(provided_code) != 6 or not provided_code.isdigit():
            await db.email_verifications.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(status_code=400, detail="Incorrect verification code")
        
        if not hmac.compare_digest(provided_code, rec["code"]):
            await db.email_verifications.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(status_code=400, detail="Incorrect verification code")

        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")

        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"email_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.email_verifications.delete_one({"email": email})

        # Welcome email (best-effort; skip-mode logs only)
        try:
            email_service.send_welcome(email, user.get("name"))
        except Exception as e:
            logger.warning(f"[auth] welcome email failed: {e}")

        user["email_verified"] = True
        access = create_access_token(user["user_id"], email)
        refresh = create_refresh_token(user["user_id"])
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
@limiter.limit("10/hour")
async def login(request: Request, body: LoginRequest, response: Response):
    """Authenticate user with email and password."""
    try:
        email = body.email.lower().strip()
        
        # Check if account is locked
        if _is_account_locked(email):
            logger.warning(f"[auth] Login attempt to locked account: {email}")
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed login attempts. Try again in {LOCKOUT_DURATION_MIN} minutes."
            )
        
        user = await db.users.find_one({"email": email})
        if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
            _record_failed_login(email)
            logger.warning(f"[auth] Failed login attempt: {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if user.get("active") is False:
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
        if user.get("email_verified", True) is False:
            raise HTTPException(status_code=403, detail="Please verify your email address to continue. We can send you a new code.")
        
        _reset_failed_login(email)
        access = create_access_token(user["user_id"], email)
        refresh = create_refresh_token(user["user_id"])
        set_auth_cookies(response, access, refresh)
        logger.info(f"[auth] Login successful: {email}")
        return {"user": _public_user(user), "access_token": access}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[auth] login error: {str(e)[:100]}")
        raise HTTPException(status_code=500, detail="Login failed")


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
        
        access = create_access_token(user["user_id"], user["email"])
        response.set_cookie(
            "access_token",
            access,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=ACCESS_TTL_MIN * 60,
            path="/"
        )
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
    return _public_user(user)


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
            if not new_email or "@" not in new_email:
                raise HTTPException(status_code=400, detail="Invalid email address")
            if len(new_email) > 255:
                raise HTTPException(status_code=400, detail="Email too long")
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
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        logger.info(f"[auth] Password changed: {user['email']}")
        return {"ok": True, "message": "Password updated"}
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
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"plan": plan, "plan_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
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
            "dev_mode": not email_service.is_configured(),
            "dev_link": None,
            "message": "If an account exists for that email, a reset link is on its way."
        }
        if not user:
            return generic
        if not user.get("password_hash") and user.get("auth_provider") == "google":
            return generic

        token = await create_password_reset(user["user_id"])
        base = (body.base_url or "").rstrip("/")
        reset_link = f"{base}/reset-password?token={token}"
        status = email_service.send_password_reset(email, user.get("name"), reset_link)
        dev = not email_service.is_configured()
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
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        await db.password_resets.update_one({"token": body.token}, {"$set": {"used": True}})
        logger.info(f"[auth] Password reset completed for user {rec['user_id']}")
        return {"ok": True, "message": "Your password has been reset. You can now sign in."}
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
    """Public avatar fetch — embedded in <img> tags so it does not require a session."""
    try:
        # Validate file_id format
        if not file_id or len(file_id) > 100:
            raise HTTPException(status_code=400, detail="Invalid file ID")
        
        data = await download_file(file_id)
        # Look up the matching user to get the original content-type
        user = await db.users.find_one({"picture": f"/api/auth/avatar/{file_id}"},
                                       {"_id": 0, "avatar_content_type": 1})
        ctype = (user or {}).get("avatar_content_type") or "image/jpeg"
        return FastResponse(
            content=data,
            media_type=ctype,
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        logger.warning(f"[auth] get_avatar error: {str(e)[:100]}")
        raise HTTPException(status_code=404, detail="Avatar not found")


async def seed_admin():
    """Seed a demo sender + an internal admin account, and backfill account defaults."""
    try:
        # Backfill defaults for any pre-existing users
        await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})
        await db.users.update_many({"plan": {"$exists": False}}, {"$set": {"plan": "free"}})
        await db.users.update_many({"active": {"$exists": False}}, {"$set": {"active": True}})
        await db.users.update_many({"mobile": {"$exists": False}}, {"$set": {"mobile": None}})
        # Existing accounts predate email verification — grandfather them as verified.
        await db.users.update_many({"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}})

        # Demo sender account (regular user)
        email = os.environ.get("ADMIN_EMAIL", "user@civicsign.app").lower()
        password = os.environ.get("ADMIN_PASSWORD")
        
        if not password:
            logger.warning("[auth] ADMIN_PASSWORD not set - using default (INSECURE!)")
            password = "Welcome@2026!"
        
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:16]}",
                "email": email,
                "name": "CivicSign Demo",
                "password_hash": hash_password(password),
                "picture": None,
                "mobile": None,
                "auth_provider": "password",
                "role": "user",
                "plan": "pro",
                "active": True,
                "email_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"[auth] Seeded demo account {email}")
        elif not verify_password(password, existing.get("password_hash") or ""):
            await db.users.update_one({"email": email},
                                      {"$set": {"password_hash": hash_password(password)}})

        # Internal admin account (role=admin)
        admin_email = os.environ.get("INTERNAL_ADMIN_EMAIL", "admin@civicsign.app").lower()
        admin_password = os.environ.get("INTERNAL_ADMIN_PASSWORD")
        
        if not admin_password:
            logger.warning("[auth] INTERNAL_ADMIN_PASSWORD not set - using default (INSECURE!)")
            admin_password = "Admin@2026!"
        
        admin = await db.users.find_one({"email": admin_email})
        if not admin:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:16]}",
                "email": admin_email,
                "name": "CivicSign Admin",
                "password_hash": hash_password(admin_password),
                "picture": None,
                "mobile": None,
                "auth_provider": "password",
                "role": "admin",
                "plan": "business",
                "active": True,
                "email_verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"[auth] Seeded internal admin account {admin_email}")
        else:
            patch = {"role": "admin", "active": True, "email_verified": True}
            if not verify_password(admin_password, admin.get("password_hash") or ""):
                patch["password_hash"] = hash_password(admin_password)
            await db.users.update_one({"email": admin_email}, {"$set": patch})
    except Exception as e:
        logger.error(f"[auth] seed_admin error: {str(e)[:100]}")
