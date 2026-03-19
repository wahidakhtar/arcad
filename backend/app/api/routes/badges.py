from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import badges as badge_service

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("")
def list_badges(badge_type: Optional[str] = Query(default=None, alias="type"), db: Session = Depends(get_db)):
    return badge_service.list_badges(db, badge_type)
