from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.auth import set_auth_cookies
from app.core.database import get_db
from app.schemas.auth import SessionResponse
from app.schemas.setup import CreateCEORequest
from app.models.hr import User
from app.services.auth import setup_ceo

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status")
def setup_status(db: Session = Depends(get_db)):
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {"setup_required": user_count == 0, "user_count": user_count}


@router.post("", response_model=SessionResponse)
def setup(payload: CreateCEORequest, response: Response, db: Session = Depends(get_db)):
    data = setup_ceo(db, payload.label, payload.username, payload.password)
    set_auth_cookies(response, data.access_token, data.refresh_token, data.expires_at, data.refresh_expires_at)
    return SessionResponse(
        expires_at=data.expires_at,
        refresh_expires_at=data.refresh_expires_at,
        user_id=data.user_id,
        username=data.username,
        label=data.label,
        roles=data.roles,
    )
