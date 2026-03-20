from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import UserContext, check_permission, get_current_user
from app.core.database import get_db
from app.services import updates as update_service

router = APIRouter(prefix="/updates", tags=["updates"])


def _require_update_read(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)) -> UserContext:
    """Allow if user has update read OR acc_update read."""
    has_read = check_permission(user, None, "update", "read", db) or \
               check_permission(user, None, "acc_update", "read", db)
    if not has_read:
        raise HTTPException(status_code=403, detail="read access denied for updates")
    return user


def _require_update_write(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)) -> UserContext:
    """Allow if user has update write OR acc_update write."""
    has_write = check_permission(user, None, "update", "write", db) or \
                check_permission(user, None, "acc_update", "write", db)
    if not has_write:
        raise HTTPException(status_code=403, detail="write access denied for updates")
    return user


@router.get("")
def list_updates(
    site_id: int = Query(...),
    db: Session = Depends(get_db),
    user: UserContext = Depends(_require_update_read),
):
    return update_service.list_updates(db, site_id, user)


@router.post("")
def create_update(
    payload: dict,
    db: Session = Depends(get_db),
    user: UserContext = Depends(_require_update_write),
):
    return update_service.create_update(db, payload, user)
