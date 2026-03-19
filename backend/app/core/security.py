from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, payload: dict[str, Any]) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    data = {"sub": subject, "exp": expires_at, **payload}
    return jwt.encode(data, settings.effective_jwt_secret, algorithm=ALGORITHM), expires_at


def create_refresh_token(subject: str, session_id: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_expiry_days)
    data = {"sub": subject, "sid": session_id, "type": "refresh", "exp": expires_at}
    return jwt.encode(data, settings.effective_jwt_secret, algorithm=ALGORITHM), expires_at


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.effective_jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
