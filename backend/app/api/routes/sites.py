from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from decimal import Decimal

from app.api.auth import UserContext, get_current_user, permission_required
from app.core.database import get_db
from app.schemas.site import FEAssignmentRequest, FERemovalRequest, SiteCreate, SiteOut, SiteUpdate
from app.services import sites as sites_service
from app.services import sites as site_service


class TerminationCreate(BaseModel):
    date: date


class RechargeCreate(BaseModel):
    date: date
    amount: Decimal
    validity: int
    uom: str

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("/{project_key}")
def list_sites(
    project_key: str,
    user: UserContext = Depends(permission_required("site", "read")),
    db: Session = Depends(get_db),
    exclude_staged: bool = Query(default=False),
    subproject_id: Optional[int] = Query(default=None),
):
    return site_service.list_sites(db, user, project_key, exclude_staged=exclude_staged, subproject_id=subproject_id)


@router.post("/{project_key}")
def create_site(project_key: str, payload: SiteCreate, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    return site_service.create_site(db, user, project_key, payload.subproject_id, payload.data)


@router.get("/{project_key}/{site_id}", response_model=SiteOut)
def get_site(project_key: str, site_id: int, user: UserContext = Depends(permission_required("site", "read")), db: Session = Depends(get_db)):
    return site_service.get_site(db, user, project_key, site_id)


@router.patch("/{project_key}/{site_id}")
def update_site(project_key: str, site_id: int, payload: SiteUpdate, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    return site_service.update_site(db, user, project_key, site_id, payload.data)


@router.post("/{project_key}/{site_id}/assignments", response_model=SiteOut)
def assign(project_key: str, site_id: int, payload: FEAssignmentRequest, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    return site_service.assign_fe(db, user, project_key, site_id, payload)


@router.delete("/{project_key}/{site_id}/assignments/{assignment_id}", response_model=SiteOut)
def remove_assignment(project_key: str, site_id: int, assignment_id: int, payload: FERemovalRequest, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    return site_service.remove_assignment(db, user, project_key, site_id, assignment_id, payload.final_cost)


# Legacy remove route — kept for backwards compatibility with existing frontend
@router.patch("/{project_key}/{site_id}/assignments/{fe_id}/{bucket_id}/remove", response_model=SiteOut)
def remove_fe(project_key: str, site_id: int, fe_id: int, bucket_id: int, payload: FERemovalRequest, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    return site_service.remove_fe_assignment(db, user, project_key, site_id, fe_id, bucket_id, payload.final_cost)


@router.get("/bb/{site_id}/recharges", dependencies=[Depends(permission_required("site", "read"))])
def list_recharges(
    site_id: int,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sites_service.list_recharges(db, user, site_id)


@router.post("/bb/{site_id}/recharges", dependencies=[Depends(permission_required("site", "write"))])
def create_recharge(
    site_id: int,
    payload: RechargeCreate,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sites_service.create_recharge(db, user, site_id, payload.date, payload.amount, payload.validity, payload.uom)


@router.post("/bb/{site_id}/terminations", dependencies=[Depends(permission_required("site", "write"))])
def create_termination(
    site_id: int,
    payload: TerminationCreate,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return sites_service.create_termination(db, user, "bb", site_id, payload.date)
