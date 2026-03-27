from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from decimal import Decimal

from app.api.auth import UserContext, get_current_user, permission_required
from app.core.database import get_db
from app.core.ws_manager import manager as ws_manager
from app.schemas.site import SubconAssignmentRequest, FERemovalRequest, SiteCreate, SiteOut, SiteUpdate
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


@router.get("/lookup")
def lookup_site(
    project_key: str = Query(...),
    site_id: int = Query(...),
    user: UserContext = Depends(permission_required("site", "read")),
    db: Session = Depends(get_db),
):
    """Return a single site by project_key + site_id (lightweight lookup to avoid full-list fetches)."""
    result = site_service.get_site(db, user, project_key, site_id)
    return {"id": result.id, "ckt_id": result.ckt_id}


@router.get("/{project_key}")
def list_sites(
    project_key: str,
    user: UserContext = Depends(permission_required("site", "read")),
    db: Session = Depends(get_db),
    exclude_staged: bool = Query(default=False),
    subproject_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    search: Optional[str] = Query(default=None),
):
    return site_service.list_sites(db, user, project_key, exclude_staged=exclude_staged, subproject_id=subproject_id, page=page, page_size=page_size, search=search)


@router.post("/{project_key}")
async def create_site(project_key: str, payload: SiteCreate, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    result = site_service.create_site(db, user, project_key, payload.subproject_id, payload.data)
    await ws_manager.broadcast({"type": "SITE_CREATED", "site_id": result.id, "project_key": project_key})
    return result


@router.get("/{project_key}/{site_id}", response_model=SiteOut)
def get_site(project_key: str, site_id: int, user: UserContext = Depends(permission_required("site", "read")), db: Session = Depends(get_db)):
    return site_service.get_site(db, user, project_key, site_id)


@router.patch("/{project_key}/{site_id}")
async def update_site(project_key: str, site_id: int, payload: SiteUpdate, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    result = site_service.update_site(db, user, project_key, site_id, payload.data)
    await ws_manager.broadcast({"type": "SITE_UPDATED", "site_id": site_id, "project_key": project_key})
    return result


@router.post("/{project_key}/{site_id}/assignments", response_model=SiteOut)
async def assign(project_key: str, site_id: int, payload: SubconAssignmentRequest, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    result = site_service.assign_subcon(db, user, project_key, site_id, payload)
    await ws_manager.broadcast({"type": "SITE_UPDATED", "site_id": site_id, "project_key": project_key})
    return result


@router.delete("/{project_key}/{site_id}/assignments/{assignment_id}", response_model=SiteOut)
async def remove_assignment(project_key: str, site_id: int, assignment_id: int, payload: FERemovalRequest, user: UserContext = Depends(permission_required("site", "write")), db: Session = Depends(get_db)):
    result = site_service.remove_assignment(db, user, project_key, site_id, assignment_id, payload.final_cost)
    await ws_manager.broadcast({"type": "SITE_UPDATED", "site_id": site_id, "project_key": project_key})
    return result


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
