from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.services import users as user_service

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/available", dependencies=[Depends(permission_required("user", "write"))])
def available_roles(user_id: int = Query(), db: Session = Depends(get_db)):
    return user_service.get_available_roles(db, user_id)
