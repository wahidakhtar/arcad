from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user
from app.core.database import get_db
from app.schemas.site import FEAssignmentRequest, FERemovalRequest, SiteCreate, SiteOut, SiteUpdate
from app.services import sites as site_service

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("/{project_key}")
def list_sites(
    project_key: str,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
    exclude_staged: bool = Query(default=False),
    subproject_id: Optional[int] = Query(default=None),
):
    return site_service.list_sites(db, user, project_key, exclude_staged=exclude_staged, subproject_id=subproject_id)


@router.post("/{project_key}")
def create_site(project_key: str, payload: SiteCreate, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.create_site(db, user, project_key, payload.subproject_id, payload.data)


@router.get("/{project_key}/{site_id}", response_model=SiteOut)
def get_site(project_key: str, site_id: int, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.get_site(db, user, project_key, site_id)


@router.patch("/{project_key}/{site_id}")
def update_site(project_key: str, site_id: int, payload: SiteUpdate, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.update_site(db, user, project_key, site_id, payload.data)


@router.post("/{project_key}/{site_id}/assignments", response_model=SiteOut)
def assign(project_key: str, site_id: int, payload: FEAssignmentRequest, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.assign_fe(db, user, project_key, site_id, payload)


@router.delete("/{project_key}/{site_id}/assignments/{assignment_id}", response_model=SiteOut)
def remove_assignment(project_key: str, site_id: int, assignment_id: int, payload: FERemovalRequest, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.remove_assignment(db, user, project_key, site_id, assignment_id, payload.final_cost)


# Legacy remove route — kept for backwards compatibility with existing frontend
@router.patch("/{project_key}/{site_id}/assignments/{fe_id}/{bucket_id}/remove", response_model=SiteOut)
def remove_fe(project_key: str, site_id: int, fe_id: int, bucket_id: int, payload: FERemovalRequest, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return site_service.remove_fe_assignment(db, user, project_key, site_id, fe_id, bucket_id, payload.final_cost)
