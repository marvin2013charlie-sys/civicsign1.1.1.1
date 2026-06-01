"""Authentication for CIVICSIGN: email/password (JWT) + Emergent Google OAuth.
Both flows converge on the same JWT cookie session so the rest of the app uses a
single `get_current_user` dependency.
"""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends

from db import db
from models import (
    RegisterRequest, LoginRequest, GoogleSessionRequest,
    ProfileUpdate, PasswordChange, SubscriptionUpdate,
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
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _public_user(doc: dict) -> dict:
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture"),
        "mobile": doc.get("mobile"),
        "auth_provider": doc.get("auth_provider", "password"),
        "role": doc.get("role", "user"),
        "plan": doc.get("plan", "free"),
        "active": doc.get("active", True),
        "created_at": doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
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


auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_id = f"user_{uuid.uuid4().hex[:16]}"
    doc = {
        "user_id": user_id, "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "picture": None,
        "mobile": None, "auth_provider": "password",
        "role": "user", "plan": "free", "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"user": _public_user(doc), "access_token": access}


@auth_router.post("/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
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
            "role": "user", "plan": "free", "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"picture": data.get("picture") or user.get("picture"),
                      "name": user.get("name") or data.get("name", "")}},
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
    """Update the current user's name, mobile, and email (email stays the login identity)."""
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


async def seed_admin():
    """Seed a demo sender + an internal admin account, and backfill account defaults."""
    # Backfill defaults for any pre-existing users
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})
    await db.users.update_many({"plan": {"$exists": False}}, {"$set": {"plan": "free"}})
    await db.users.update_many({"active": {"$exists": False}}, {"$set": {"active": True}})
    await db.users.update_many({"mobile": {"$exists": False}}, {"$set": {"mobile": None}})

    # Demo sender account (regular user)
    email = os.environ.get("ADMIN_EMAIL", "demo@civicsign.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "Demo1234!")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:16]}", "email": email,
            "name": "CivicSign Demo", "password_hash": hash_password(password),
            "picture": None, "mobile": None, "auth_provider": "password",
            "role": "user", "plan": "pro", "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded demo account {email}")
    elif not verify_password(password, existing.get("password_hash") or ""):
        await db.users.update_one({"email": email},
                                  {"$set": {"password_hash": hash_password(password)}})

    # Internal admin account (role=admin)
    admin_email = os.environ.get("INTERNAL_ADMIN_EMAIL", "admin@civicsign.com").lower()
    admin_password = os.environ.get("INTERNAL_ADMIN_PASSWORD", "Admin1234!")
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:16]}", "email": admin_email,
            "name": "CivicSign Admin", "password_hash": hash_password(admin_password),
            "picture": None, "mobile": None, "auth_provider": "password",
            "role": "admin", "plan": "business", "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded internal admin account {admin_email}")
    else:
        patch = {"role": "admin", "active": True}
        if not verify_password(admin_password, admin.get("password_hash") or ""):
            patch["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": patch})
