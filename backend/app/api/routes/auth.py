from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.auth import UserContext, build_project_keys, build_project_map, build_tag_map, get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.auth import LoginRequest, SessionResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_kwargs() -> dict:
    s = get_settings()
    kwargs: dict = {"httponly": True, "secure": s.cookie_secure, "samesite": "lax"}
    if s.cookie_domain:
        kwargs["domain"] = s.cookie_domain
    return kwargs


def set_auth_cookies(response: Response, access_token: str, refresh_token: str,
                     expires_at: datetime, refresh_expires_at: datetime) -> None:
    now = datetime.now(timezone.utc)
    kwargs = _cookie_kwargs()
    response.set_cookie("access_token", access_token,
                        max_age=max(int((expires_at - now).total_seconds()), 1), **kwargs)
    response.set_cookie("refresh_token", refresh_token,
                        max_age=max(int((refresh_expires_at - now).total_seconds()), 1), **kwargs)


def clear_auth_cookies(response: Response) -> None:
    kwargs = _cookie_kwargs()
    response.delete_cookie("access_token", **kwargs)
    response.delete_cookie("refresh_token", **kwargs)


@router.post("/login", response_model=SessionResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    data = auth_service.login(db, payload.username, payload.password, payload.device_label)
    set_auth_cookies(response, data.access_token, data.refresh_token, data.expires_at, data.refresh_expires_at)
    return SessionResponse(
        expires_at=data.expires_at,
        refresh_expires_at=data.refresh_expires_at,
        user_id=data.user_id,
        username=data.username,
        label=data.label,
        roles=data.roles,
    )


@router.post("/refresh", response_model=SessionResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Missing refresh token")
    data = auth_service.refresh(db, refresh_token)
    set_auth_cookies(response, data.access_token, data.refresh_token, data.expires_at, data.refresh_expires_at)
    return SessionResponse(
        expires_at=data.expires_at,
        refresh_expires_at=data.refresh_expires_at,
        user_id=data.user_id,
        username=data.username,
        label=data.label,
        roles=data.roles,
    )


@router.get("/me")
def me(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": user.user_id,
        "username": user.username,
        "label": user.label,
        "roles": [
            {
                "id":         role.role_id,
                "key":        role.role_key,
                "label":      role.role_label,
                "dept_key":   role.dept_key,
                "level_key":  role.level_key,
                "project_id": role.project_id,
            }
            for role in user.roles
        ],
        "tags":            build_tag_map(user),
        "project_keys":    build_project_keys(user, db),
        "project_labels":  build_project_map(user, db),
    }


@router.delete("/logout", status_code=204)
@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    access_token = request.cookies.get("access_token")
    if access_token:
        auth_service.logout(db, access_token)
    clear_auth_cookies(response)
