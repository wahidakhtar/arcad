from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.auth import UserContext, build_project_keys, build_tag_map, get_current_user
from app.core.database import get_db
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, payload.username, payload.password, payload.device_label)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh(db, payload.refresh_token)


@router.get("/me")
def me(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": user.user_id,
        "username": user.username,
        "label": user.label,
        "roles": [
            {
                "id": role.role_id,
                "key": role.role_key,
                "label": role.role_label,
                "dept_key": role.dept_key,
                "level_key": role.level_key,
                "project_id": role.project_id,
            }
            for role in user.roles
        ],
        "tags": build_tag_map(user),
        "project_keys": build_project_keys(user, db),
    }


@router.delete("/logout", status_code=204)
@router.post("/logout", status_code=204)
def logout(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    auth_service.logout(db, token)
