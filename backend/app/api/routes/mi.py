from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policies.mi_policy import MiPolicy

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


def require_project(role, project_code: str):
    role_set = role.get_for_project(project_code)
    require(role_set is not None)
    return role_set


@router.get("/{project_id}")
def get_sites(
    project_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    role_set = require_project(role, "mi")
    policy = MiPolicy(role_set)

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
    role_set = require_project(role, "mi")
    policy = MiPolicy(role_set)

    require(policy.can_open_detail())

    site = get_mi_site(site_id, db)

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    return {
        "data": policy.filter_site_response(site),
        "capabilities": policy.ui_capabilities(),
    }
