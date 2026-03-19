from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.services import updates as update_service

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("", dependencies=[Depends(permission_required("update", "read"))])
def list_updates(site_id: int = Query(...), db: Session = Depends(get_db)):
    return update_service.list_updates(db, site_id)


@router.post("", dependencies=[Depends(permission_required("update", "write"))])
def create_update(payload: dict, db: Session = Depends(get_db)):
    return update_service.create_update(db, payload)
