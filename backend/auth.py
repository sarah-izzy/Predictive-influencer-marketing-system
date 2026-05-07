"""Authentication helpers and FastAPI routes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from database import get_connection, init_db, utc_now_iso

TOKEN_SECRET = os.getenv("AUTH_SECRET_KEY", "dev-influencer-auth-secret-change-me")
TOKEN_TTL_HOURS = int(os.getenv("AUTH_TOKEN_TTL_HOURS", "24"))
PBKDF2_ITERATIONS = 210_000

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str
    category: Optional[str] = None
    followers: Optional[int] = Field(default=None, ge=0)


class LoginRequest(BaseModel):
    email: str
    username: str
    password: str
    role: str


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, iterations, salt, expected = stored_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
        return hmac.compare_digest(digest.hex(), expected)
    except ValueError:
        return False


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
    }
    payload_b64 = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64encode(signature)}"


def verify_token(token: str) -> str:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        expected = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64decode(signature_b64), expected):
            raise ValueError("Invalid token signature")
        payload = json.loads(_b64decode(payload_b64))
        if int(payload["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Token expired")
        return str(payload["sub"])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def serialize_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "username": row["username"],
        "role": row["role"],
        "avatar": row["avatar"],
        "company": row["company"],
        "category": row["category"],
        "followers": row["followers"],
        "tier": row["tier"],
    }


def get_user_by_id(user_id: str):
    with get_connection() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def get_current_user(authorization: str = Header(default="")) -> dict:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")
    row = get_user_by_id(verify_token(token))
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return serialize_user(row)


def validate_role(role: str) -> str:
    if role not in {"brand", "influencer"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Role must be brand or influencer")
    return role


def validate_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid email address")
    return cleaned


def influencer_tier_from_followers(followers: int) -> str:
    if followers < 10000:
        return "Nano"
    if followers < 100000:
        return "Micro"
    if followers < 500000:
        return "Mid-Tier"
    if followers < 1000000:
        return "Macro"
    return "Mega"


def create_user(payload: SignupRequest) -> dict:
    role = validate_role(payload.role)
    email = validate_email(payload.email)
    username = payload.username.strip()
    name = payload.name.strip()
    user_id = f"{role}-{uuid.uuid4().hex[:12]}"
    avatar = name[:1].upper() or username[:1].upper()
    influencer_category = (payload.category or "Lifestyle").strip() if role == "influencer" else None
    influencer_followers = payload.followers if role == "influencer" and payload.followers is not None else 10000
    defaults = (
        "Demo Company" if role == "brand" else None,
        influencer_category,
        influencer_followers if role == "influencer" else None,
        influencer_tier_from_followers(influencer_followers) if role == "influencer" else None,
    )

    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO users (
                    id, name, email, username, password_hash, role, avatar,
                    company, category, followers, tier, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    name,
                    email,
                    username,
                    hash_password(payload.password),
                    role,
                    avatar,
                    defaults[0],
                    defaults[1],
                    defaults[2],
                    defaults[3],
                    utc_now_iso(),
                ),
            )
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    except Exception as exc:
        message = str(exc).lower()
        if "unique constraint failed" in message and "email" in message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from exc
        if "unique constraint failed" in message and "username" in message:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken") from exc
        raise

    return serialize_user(row)


def seed_demo_users() -> None:
    demos = [
        SignupRequest(
            name="Acme Marketing",
            email="brand@test.com",
            username="brand_user",
            password="password123",
            role="brand",
        ),
        SignupRequest(
            name="Travel Vibes",
            email="influencer@test.com",
            username="travel_vibes",
            password="password123",
            role="influencer",
        ),
    ]
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count:
        return
    for demo in demos:
        create_user(demo)


def init_auth_storage() -> None:
    init_db()
    seed_demo_users()


@router.post("/signup")
def signup(payload: SignupRequest):
    user = create_user(payload)
    return {"token": create_token(user["id"]), "user": user}


@router.post("/login")
def login(payload: LoginRequest):
    role = validate_role(payload.role)
    email = validate_email(payload.email)
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or row["username"] != payload.username.strip() or row["role"] != role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login details")
    if not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login details")

    user = serialize_user(row)
    return {"token": create_token(user["id"]), "user": user}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": user}
