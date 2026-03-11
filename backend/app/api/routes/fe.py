# app/api/routes/fe.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.fe import FeAssignment, Finance

router = APIRouter(
    prefix="/fe",
    tags=["fe"],
    dependencies=[Depends(get_current_user)]
)


# -------------------------
# REQUEST MODELS
# -------------------------

class FeAssignRequest(BaseModel):
    fe_id: int


class FeRemoveRequest(BaseModel):
    final_fe_cost: float


# -------------------------
# FE LIST
# -------------------------

@router.get("/list/{project_code}")
def list_fe(project_code: str, db: Session = Depends(get_db)):

    rows = db.execute(
        text("""
        SELECT DISTINCT
            u.id,
            u.name
        FROM schema_core.user u
        JOIN schema_core.user_role_assignment ura
            ON ura.user_id = u.id
        JOIN schema_core.role r
            ON r.id = ura.role_id
        JOIN schema_core.badge dept
            ON dept.id = r.dept_badge_id
        JOIN schema_core.badge proj
            ON proj.id = ura.project_badge_id
        WHERE dept.badge_key = 'fo'
        AND proj.badge_key = :project_code
        AND u.is_active = true
        ORDER BY u.name
        """),
        {"project_code": project_code},
    ).mappings().all()

    return [{"id": r["id"], "name": r["name"]} for r in rows]


# -------------------------
# FE HISTORY
# -------------------------

@router.get("/history/{project_code}/{site_id}")
def fe_history(project_code: str, site_id: int, db: Session = Depends(get_db)):

    project = db.execute(
        text("""
        SELECT id, code, site_schema
        FROM schema_core.project
        WHERE code = :code
        """),
        {"code": project_code},
    ).mappings().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_id = project["id"]

    assignments = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id
        )
    ).all()

    site = db.execute(
        text(f"""
        SELECT *
        FROM {project['site_schema']}.site
        WHERE id = :site_id
        """),
        {"site_id": site_id},
    ).mappings().first()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    summary = {}

    if project["code"] == "mi":
        try:
            from app.domain.finance.mi_finance import compute_financials
            summary = compute_financials(site, db) or {}
        except Exception:
            summary = {}

    total_cost = Decimal(str(summary.get("cost", 0)))
    closed_total = Decimal(0)

    for a in assignments:
        if not a.is_active:
            closed_total += Decimal(str(a.final_fe_cost or 0))

    result = []

    for a in assignments:

        fe_name = db.execute(
            text("""
                SELECT name
                FROM schema_core.user
                WHERE id = :uid
            """),
            {"uid": a.fe_id}
        ).scalar()

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


# -------------------------
# ASSIGN FE
# -------------------------

@router.post("/assign/{project_code}/{site_id}")
def assign_fe(
    project_code: str,
    site_id: int,
    payload: FeAssignRequest,
    db: Session = Depends(get_db)
):

    project = db.execute(
        text("""
        SELECT id
        FROM schema_core.project
        WHERE code = :code
        """),
        {"code": project_code},
    ).mappings().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assignment = FeAssignment(
        project_id=project["id"],
        site_id=site_id,
        fe_id=payload.fe_id,
        is_active=True
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return {
        "message": "assigned",
        "id": assignment.id
    }


# -------------------------
# REMOVE FE
# -------------------------

@router.post("/remove/{project_code}/{site_id}")
def remove_fe(
    project_code: str,
    site_id: int,
    payload: FeRemoveRequest,
    db: Session = Depends(get_db)
):

    project = db.execute(
        text("""
        SELECT id
        FROM schema_core.project
        WHERE code = :code
        """),
        {"code": project_code},
    ).mappings().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assignment = db.query(FeAssignment).filter(
        FeAssignment.project_id == project["id"],
        FeAssignment.site_id == site_id,
        FeAssignment.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Active FE not found")

    assignment.is_active = False
    assignment.final_fe_cost = payload.final_fe_cost

    db.commit()
    db.refresh(assignment)

    return {
        "message": "removed",
        "id": assignment.id
    }