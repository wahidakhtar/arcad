from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import TokenResponse
from app.schemas.setup import CreateCEORequest
from app.models.hr import User
from app.services.auth import setup_ceo

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status")
def setup_status(db: Session = Depends(get_db)):
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {"setup_required": user_count == 0, "user_count": user_count}


@router.post("", response_model=TokenResponse)
def setup(payload: CreateCEORequest, db: Session = Depends(get_db)):
    return setup_ceo(db, payload.label, payload.username, payload.password)
