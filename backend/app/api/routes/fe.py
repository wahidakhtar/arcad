from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.models.fe import FeAssignment, Fe, Finance
from app.models.mi import Mi

from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project

router = APIRouter(prefix="/api/v1/fe", tags=["fe"])


class FeAssignRequest(BaseModel):
    project_id: int
    site_id: int
    fe_id: int


class FeRemoveRequest(BaseModel):
    project_id: int
    site_id: int
    final_fe_cost: float


@router.get("/list/{project_id}")
def list_fe(
    project_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_view_finance())

    rows = db.query(Fe).filter(Fe.is_active == True).all()
    return [{"id": r.id, "name": r.name} for r in rows]


@router.get("/history/{project_id}/{site_id}")
def fe_history(
    project_id: int,
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_view_finance())

    assignments = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id
        )
    ).all()

    return assignments


@router.post("/assign")
def assign_fe(
    payload: FeAssignRequest,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, payload.project_id, db)
    require(policy.can_assign_fe())

    assignment = FeAssignment(
        project_id=payload.project_id,
        site_id=payload.site_id,
        fe_id=payload.fe_id,
        is_active=True
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return {"message": "assigned", "id": assignment.id}


@router.post("/remove")
def remove_fe(
    payload: FeRemoveRequest,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, payload.project_id, db)
    require(policy.can_assign_fe())

    assignment = db.query(FeAssignment).filter(
        FeAssignment.project_id == payload.project_id,
        FeAssignment.site_id == payload.site_id,
        FeAssignment.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Active FE not found")

    assignment.is_active = False
    assignment.final_fe_cost = payload.final_fe_cost

    db.commit()
    db.refresh(assignment)

    return {"message": "removed", "id": assignment.id}
