from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project

from app.domain.mi.commands import update_site_command
from app.domain.mi.create_command import create_site_command
from app.services.mi_service import get_mi_sites, get_mi_site

router = APIRouter(prefix="/api/v1/mi", tags=["mi"])


class MiCreate(BaseModel):
    project_id: int
    ckt_id: str
    customer: str
    receiving_date: date
    height_m: float
    city: str | None = None
    lc: str | None = None


@router.get("/{project_id}")
def get_sites(
    project_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)

    sites = get_mi_sites(project_id, db)

    return {
        "data": policy.filter_site_response(sites),
        "capabilities": policy.ui_capabilities(),
    }


@router.get("/site/{site_id}")
def get_single_site(
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    site = get_mi_site(site_id, db)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    policy = resolve_policy_for_project(role, site["project_id"], db)
    require(policy.can_open_detail())

    return {
        "data": policy.filter_site_response(site),
        "capabilities": policy.ui_capabilities(),
    }


@router.post("/create")
def create_site(
    payload: MiCreate,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, payload.project_id, db)
    require(policy.can_create_site())

    site = create_site_command(payload, db)
    return site


@router.put("/site/{site_id}")
def update_site(
    site_id: int,
    payload: dict,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    site = get_mi_site(site_id, db)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    policy = resolve_policy_for_project(role, site["project_id"], db)
    require(policy.can_edit_site())

    updated = update_site_command(site_id, payload, db)
    return updated
