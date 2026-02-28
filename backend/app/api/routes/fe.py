from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.core.database import get_db
from app.models.fe import FeAssignment, Fe, Finance
from app.models.mi import Mi

router = APIRouter(prefix="/api/v1/fe", tags=["fe"])


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

    result = []

    for a in assignments:
        fe_name = db.query(Fe.name).filter(Fe.id == a.fe_id).scalar()

        # 🔥 FE-level paid calculation
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
        surcharge = db.query(func.coalesce(func.sum(Finance.amount), 0)).filter(
            Finance.site_id == site_id,
            Finance.fe_id == a.fe_id,
            Finance.state == "executed",
            Finance.type == "surcharge"
        ).scalar()
        allocation = float(a.final_fe_cost or 0) + float(surcharge)
        surcharge = db.query(func.coalesce(func.sum(Finance.amount), 0)).filter(
            Finance.site_id == site_id,
            Finance.fe_id == a.fe_id,
            Finance.state == "executed",
            Finance.type == "surcharge"
        ).scalar()
        surcharge = db.query(func.coalesce(func.sum(Finance.amount), 0)).filter(
            Finance.site_id == site_id,
            Finance.fe_id == a.fe_id,
            Finance.state == "executed",
            Finance.type == "surcharge"
        ).scalar()
        allocation = float(a.final_fe_cost or 0) + float(surcharge)

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
