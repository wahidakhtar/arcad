from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.fe import FeAssignment, Fe, Finance
from app.models.mi import Mi
from app.domain.finance.mi_finance import compute_financials

router = APIRouter(
    prefix="/api/v1/fe",
    tags=["fe"],
    dependencies=[Depends(get_current_user)]
)


class FeAssignRequest(BaseModel):
    project_id: int
    site_id: int
    fe_id: int


class FeRemoveRequest(BaseModel):
    project_id: int
    site_id: int
    final_fe_cost: float


@router.get("/list/{project_id}")
def list_fe(project_id: int, db: Session = Depends(get_db)):
    rows = db.query(Fe).filter(Fe.is_active == True).all()
    return [{"id": r.id, "name": r.name} for r in rows]


@router.get("/history/{project_id}/{site_id}")
def fe_history(project_id: int, site_id: int, db: Session = Depends(get_db)):
    assignments = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id
        )
    ).all()

    site = db.query(Mi).filter(
        Mi.id == site_id,
        Mi.project_id == project_id
    ).first()

    summary = compute_financials(site, db) or {}
    total_cost = Decimal(str(summary.get("cost", 0)))

    closed_total = Decimal(0)
    for a in assignments:
        if not a.is_active:
            closed_total += Decimal(str(a.final_fe_cost or 0))

    result = []

    for a in assignments:
        fe_name = db.query(Fe.name).filter(Fe.id == a.fe_id).scalar()

        payments = db.query(func.coalesce(func.sum(Finance.amount), 0)).filter(
            Finance.site_id == site_id,
            Finance.fe_id == a.fe_id,
            Finance.state == "executed",
            Finance.type == "payment"
        ).scalar()

        refunds = db.query(func.coalesce(func.sum(Finance.amount), 0)).filter(
            Finance.site_id == site_id,
            Finance.fe_id == a.fe_id,
            Finance.state == "executed",
            Finance.type == "refund"
        ).scalar()

        fe_paid = float(payments) - float(refunds)

        if a.is_active:
            allocation = float(total_cost - closed_total)
        else:
            allocation = float(a.final_fe_cost or 0)

        result.append({
            "id": a.id,
            "fe_id": a.fe_id,
            "fe_name": fe_name,
            "final_fe_cost": allocation,
            "paid": fe_paid,
            "balance": allocation - fe_paid,
            "is_active": a.is_active
        })

    return result


@router.post("/assign")
def assign_fe(payload: FeAssignRequest, db: Session = Depends(get_db)):
    try:
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
    except Exception:
        raise HTTPException(status_code=400, detail="FE assign failed")


@router.post("/remove")
def remove_fe(payload: FeRemoveRequest, db: Session = Depends(get_db)):
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
