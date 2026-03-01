from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project
from app.models.fe import Finance, Fe
from app.models.mi import Mi
from app.domain.finance.mi_finance import compute_financials

router = APIRouter(
    prefix="/api/v1/finance",
    tags=["finance"],
    dependencies=[Depends(get_current_user)]
)


class FinanceRequest(BaseModel):
    project_id: int
    site_id: int
    fe_id: int
    amount: float
    type: str
    approval: bool


@router.post("/request")
def request_payment(
    payload: FinanceRequest,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, payload.project_id, db)
    require(policy.can_request_finance(), "Not allowed to request finance")

    entry = Finance(
        project_id=payload.project_id,
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


@router.put("/state/{finance_id}")
def update_finance_state(
    finance_id: int,
    payload: dict,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    entry = db.query(Finance).filter(Finance.id == finance_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")

    policy = resolve_policy_for_project(role, entry.project_id, db)
    require(policy.can_execute_finance(), "Not allowed to execute finance")

    old_state = entry.state
    new_state = payload.get("state")

    site = db.query(Mi).filter(Mi.id == entry.site_id).first()
    amount = Decimal(entry.amount)

    if old_state == "executed":
        if entry.type == "payment":
            site.paid = (site.paid or 0) - amount
        elif entry.type == "refund":
            site.paid = (site.paid or 0) + amount

    if new_state == "executed":
        if entry.type == "payment":
            site.paid = (site.paid or 0) + amount
        elif entry.type == "refund":
            site.paid = (site.paid or 0) - amount

    entry.state = new_state

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/site/{project_id}/{site_id}")
def site_finance(
    project_id: int,
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_view_finance(), "Not allowed to view finance")

    site = db.query(Mi).filter(
        Mi.id == site_id,
        Mi.project_id == project_id
    ).first()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    summary = compute_financials(site, db) or {}

    rows = db.query(Finance).filter(
        Finance.project_id == project_id,
        Finance.site_id == site_id
    ).all()

    transactions = [
        {
            "id": r.id,
            "fe_name": db.query(Fe.name).filter(Fe.id == r.fe_id).scalar(),
            "amount": float(r.amount),
            "state": r.state,
            "type": r.type,
            "approval": r.approval
        }
        for r in rows
    ]

    return {
        "summary": summary,
        "transactions": transactions
    }
