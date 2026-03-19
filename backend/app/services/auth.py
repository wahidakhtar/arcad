from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.auth import _load_user_context
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, hash_token, verify_password
from app.models.auth import RefreshToken, Session as AuthSession
from app.models.hr import User, UserRole, Role
from app.schemas.auth import RoleEntry, TokenResponse


def _build_role_entries(db: Session, user_id: int) -> list[RoleEntry]:
    rows = db.execute(select(UserRole, Role).join(Role, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)).all()
    return [
        RoleEntry(
            id=role.id,
            key=role.key,
            label=role.label,
            dept_key=role.dept_key,
            level_key=role.level_key,
            project_id=user_role.project_id,
        )
        for user_role, role in rows
    ]


def login(db: Session, username: str, password: str, device_label: Optional[str] = None) -> TokenResponse:
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if user is None or not verify_password(password, user.hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.active:
        raise HTTPException(status_code=401, detail="Inactive user")

    access_token, access_expires_at = create_access_token(str(user.id), {"username": user.username})
    auth_session = AuthSession(user_id=user.id, token_hash=hash_token(access_token), device_label=device_label, expires_at=access_expires_at, created_at=datetime.now(timezone.utc))
    db.add(auth_session)
    db.flush()
    refresh_token, refresh_expires_at = create_refresh_token(str(user.id), str(auth_session.id))
    db.add(RefreshToken(session_id=auth_session.id, token_hash=hash_token(refresh_token), expires_at=refresh_expires_at, created_at=datetime.now(timezone.utc)))
    db.commit()
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
        user_id=user.id,
        username=user.username,
        label=user.label,
        roles=_build_role_entries(db, user.id),
    )


def refresh(db: Session, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    session_id = int(payload["sid"])
    session = db.get(AuthSession, session_id)
    token_row = db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token))).scalar_one_or_none()
    if session is None or token_row is None or token_row.revoked_at is not None or token_row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")

    token_row.revoked_at = datetime.now(timezone.utc)
    access_token, access_expires_at = create_access_token(str(session.user_id), {})
    session.token_hash = hash_token(access_token)
    session.expires_at = access_expires_at
    new_refresh_token, refresh_expires_at = create_refresh_token(str(session.user_id), str(session.id))
    db.add(RefreshToken(session_id=session.id, token_hash=hash_token(new_refresh_token), expires_at=refresh_expires_at, created_at=datetime.now(timezone.utc)))
    db.commit()
    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise HTTPException(status_code=401, detail="Inactive user")
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
        user_id=user.id,
        username=user.username,
        label=user.label,
        roles=_build_role_entries(db, user.id),
    )


def logout(db: Session, access_token: str) -> None:
    token_hash_value = hash_token(access_token)
    session = db.execute(select(AuthSession).where(AuthSession.token_hash == token_hash_value)).scalar_one_or_none()
    if session is not None:
        db.execute(delete(RefreshToken).where(RefreshToken.session_id == session.id))
        db.delete(session)
        db.commit()


def setup_ceo(db: Session, label: str, username: str, password: str) -> TokenResponse:
    existing = db.execute(select(User)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Setup already completed")
    user = User(username=username, label=label, hash=hash_password(password), active=True, created_at=datetime.now(timezone.utc))
    db.add(user)
    db.flush()
    role = db.execute(select(Role).where(Role.key == "mgmtl3")).scalar_one()
    db.add(UserRole(user_id=user.id, role_id=role.id, project_id=None))
    db.commit()
    return login(db, username, password)
