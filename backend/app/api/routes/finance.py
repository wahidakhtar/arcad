# app/api/routes/finance.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project

from app.models.fe import Finance

router = APIRouter(
    prefix="/api/v1/finance",
    tags=["finance"],
    dependencies=[Depends(get_current_user)]
)


class FinanceRequest(BaseModel):
    project_code: str
    site_id: int
    fe_id: int
    amount: float
    type: str
    approval: bool


# --------------------------------------------------
# REQUEST PAYMENT
# --------------------------------------------------

@router.post("/request")
def request_payment(
    payload: FinanceRequest,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = db.execute(
        text("""
            SELECT id, code
            FROM schema_core.project
            WHERE LOWER(code) = LOWER(:code)
        """),
        {"code": payload.project_code}
    ).mappings().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_id = project["id"]

    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_request_finance(), "Not allowed to request finance")

    entry = Finance(
        project_id=project_id,
        site_id=payload.site_id,
        fe_id=payload.fe_id,
        type=payload.type,
        state="requested",
        amount=payload.amount,
        approval=payload.approval,
        execution_date=None
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# UPDATE FINANCE STATE
# --------------------------------------------------

@router.put("/state/{finance_id}")
def update_finance_state(
    finance_id: int,
    payload: dict,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    entry = db.query(Finance).filter(Finance.id == finance_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Finance entry not found")

    policy = resolve_policy_for_project(role, entry.project_id, db)
    require(policy.can_execute_finance(), "Not allowed to execute finance")

    entry.state = payload.get("state")

    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# SITE FINANCE
# --------------------------------------------------

@router.get("/site/{project_code}/{site_id}")
def site_finance(
    project_code: str,
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = db.execute(
        text("""
            SELECT id, site_schema, code
            FROM schema_core.project
            WHERE LOWER(code) = LOWER(:code)
        """),
        {"code": project_code}
    ).mappings().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_id = project["id"]

    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_view_finance(), "Not allowed to view finance")

    site = db.execute(
        text(f"""
            SELECT *
            FROM {project['site_schema']}.site
            WHERE id = :site_id
        """),
        {"site_id": site_id}
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

    rows = db.execute(
        text("""
            SELECT
                f.id,
                f.fe_id,
                u.name AS fe_name,
                f.amount,
                f.state,
                f.type,
                f.approval
            FROM schema_core.finance f
            LEFT JOIN schema_core.user u
                ON u.id = f.fe_id
            WHERE f.project_id = :project_id
            AND f.site_id = :site_id
            ORDER BY f.id
        """),
        {"project_id": project_id, "site_id": site_id}
    ).mappings().all()

    transactions = [
        {
            "id": r["id"],
            "fe_id": r["fe_id"],
            "fe_name": r["fe_name"],
            "amount": float(r["amount"]),
            "state": r["state"],
            "type": r["type"],
            "approval": r["approval"]
        }
        for r in rows
    ]

    return {
        "summary": summary,
        "transactions": transactions
    }