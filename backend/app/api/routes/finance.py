from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project

from app.services.finance_service import (
    resolve_project,
    request_payment,
    update_finance_state,
    get_site_finance,
    get_rate_card_list,
    get_finance_requests,
    get_po_invoice_list,
    update_po_invoice_state
)


router = APIRouter(
    prefix="/finance",
    tags=["finance"],
    dependencies=[Depends(get_current_user)],
)


# --------------------------------------------------
# RATE CARD
# --------------------------------------------------

@router.get("/rate-card")
def rate_card_list(
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    return get_rate_card_list(db)


# --------------------------------------------------
# FINANCE REQUESTS
# --------------------------------------------------

@router.get("/requests")
def finance_requests(
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    return get_finance_requests(db)


# --------------------------------------------------
# PO / INVOICE LIST
# --------------------------------------------------

@router.get("/po-invoice")
def po_invoice_list(
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    return get_po_invoice_list(db)


# --------------------------------------------------
# UPDATE PO / INVOICE STATE
# --------------------------------------------------

class PoStateUpdate(BaseModel):
    state: str


@router.put("/po-invoice/{po_id}")
def update_po_invoice(
    po_id: int,
    payload: PoStateUpdate,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    row = update_po_invoice_state(po_id, payload.state, db)

    if not row:
        raise HTTPException(status_code=404, detail="PO not found")

    return row


# --------------------------------------------------
# REQUEST PAYMENT
# --------------------------------------------------

class FinanceRequest(BaseModel):
    project_code: str
    site_id: int
    fe_id: int
    amount: float
    type: str
    approval: bool


@router.post("/request")
def request_payment_route(
    payload: FinanceRequest,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = resolve_project(payload.project_code, db)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    policy = resolve_policy_for_project(role, project["id"], db)
    require(policy.can_request_finance(), "Not allowed to request finance")

    return request_payment(project, payload, db)


# --------------------------------------------------
# UPDATE FINANCE STATE
# --------------------------------------------------

class FinanceStateUpdate(BaseModel):
    state: str


@router.put("/state/{finance_id}")
def update_finance_state_route(
    finance_id: int,
    payload: FinanceStateUpdate,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    entry = update_finance_state(finance_id, payload.state, db)

    if not entry:
        raise HTTPException(status_code=404, detail="Finance entry not found")

    policy = resolve_policy_for_project(role, entry.project_id, db)
    require(policy.can_execute_finance(), "Not allowed to execute finance")

    return entry


# --------------------------------------------------
# SITE FINANCE SUMMARY
# --------------------------------------------------

@router.get("/site/{project_code}/{site_id}")
def site_finance(
    project_code: str,
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = resolve_project(project_code, db)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    policy = resolve_policy_for_project(role, project["id"], db)
    require(policy.can_view_finance(), "Not allowed to view finance")

    return get_site_finance(project, site_id, db)