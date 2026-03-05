from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project
from app.domain.mi.commands import update_site_command
from app.domain.mi.create_command import create_site_command
from app.services.mi_service import get_mi_sites, get_mi_site

router = APIRouter(
    prefix="/api/v1",
    tags=["mi"]
)


class MiCreate(BaseModel):
    project_code: str
    ckt_id: str
    customer: str
    receiving_date: date
    height_m: float
    city: str | None = None
    lc: str | None = None


@router.get("/site/fields")
def get_site_fields(db: Session = Depends(get_db)):

    rows = db.execute(text("""
        SELECT
            column_name,
            col_description('schema_mi.site'::regclass, ordinal_position) AS label
        FROM information_schema.columns
        WHERE table_schema='schema_mi'
        AND table_name='site'
        AND column_name NOT IN ('id','project_id')
        ORDER BY ordinal_position
    """)).mappings().all()

    return rows


@router.get("/{project_id}")
def get_sites(
    project_code: str,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_open_detail())

    sites = get_mi_sites(project_id, db)

    return {
        "data": policy.filter_site_response(sites)
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
        "data": policy.filter_site_response(site)
    }


@router.post("/create")
def create_site(
    payload: MiCreate,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = db.execute(
        text("""
        SELECT id
        FROM schema_core.project
        WHERE code = :code
        """),
        {"code": payload.project_code}
    ).fetchone()

    if not project:
        raise HTTPException(status_code=404, detail="Invalid project code")

    project_id = project.id

    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_create_site())

    payload_dict = payload.dict()
    payload_dict["project_id"] = project_id

    return create_site_command(type("Obj", (), payload_dict), db)



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

    for field in payload.keys():
        if not policy.permissions.get(field, {}).get("edit", False):
            raise HTTPException(
                status_code=403,
                detail=f"Field '{field}' is not editable"
            )

    updated = update_site_command(site_id, payload, db)

    updated_dict = {c.name: getattr(updated, c.name) for c in updated.__table__.columns}

    return {
        "data": policy.filter_site_response(updated_dict)
    }
