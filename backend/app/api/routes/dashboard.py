from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user
from app.core.database import get_db
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(
    range_key: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return dashboard_service.summary(db, user, range_key, start_date, end_date)


@router.get("/map")
def map_data(
    range_key: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return dashboard_service.map_data(db, user, range_key, start_date, end_date)
