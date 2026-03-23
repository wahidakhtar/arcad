from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user
from app.core.database import get_db
from app.services import projects as project_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/projects")
def my_projects(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    """Projects accessible to the current user. No tag requirement — used for navigation."""
    return project_service.list_projects(db, user)
