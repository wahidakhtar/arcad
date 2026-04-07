from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user, permission_required
from app.core.database import get_db
from app.core.ws_manager import manager as ws_manager
from app.models.core import Badge, Project
from app.schemas.transaction import StatusUpdate, TransactionCreate
from app.services import transactions as transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/transitions", dependencies=[Depends(permission_required("transaction", "read"))])
def list_transitions(db: Session = Depends(get_db)):
    return transaction_service.list_transitions(db)


@router.get("")
def list_transactions(
    user: UserContext = Depends(permission_required("transaction", "read")),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
):
    return transaction_service.list_transactions(db, user, page=page, page_size=page_size)


@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    user: UserContext = Depends(permission_required("transaction", "read")),
    db: Session = Depends(get_db),
):
    tx = transaction_service.get_transaction(db, user, transaction_id)
    if tx is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("", dependencies=[Depends(permission_required("request", "write"))])
async def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    result = transaction_service.create_transaction(db, payload)
    await ws_manager.broadcast({"type": "TRANSACTION_CREATED"})
    await ws_manager.broadcast({"type": "NOTIFICATION", "message": "New payment request submitted", "dept_target": "acc"})
    if isinstance(result, dict) and result.get("site_id"):
        project = db.get(Project, result["project_id"])
        if project:
            await ws_manager.broadcast({"type": "SITE_UPDATED", "site_id": result["site_id"], "project_key": project.key})
    return result


@router.patch("/{transaction_id}/status")
async def update_status(
    transaction_id: int,
    payload: StatusUpdate,
    user: UserContext = Depends(permission_required("transaction", "write")),
    db: Session = Depends(get_db),
):
    result = transaction_service.update_status(
        db, user, transaction_id, payload.status_id, payload.version, payload.execution_date
    )
    await ws_manager.broadcast({"type": "TRANSACTION_UPDATED", "transaction_id": transaction_id})
    # Notify ops when acc acts on a transaction
    target_badge = db.get(Badge, payload.status_id)
    if target_badge is not None and target_badge.key in ("exct", "rej"):
        msg = "Payment request executed" if target_badge.key == "exct" else "Payment request rejected"
        await ws_manager.broadcast({"type": "NOTIFICATION", "message": msg, "dept_target": "ops"})
    if isinstance(result, dict) and result.get("site_id"):
        project = db.get(Project, result["project_id"])
        if project:
            await ws_manager.broadcast({"type": "SITE_UPDATED", "site_id": result["site_id"], "project_key": project.key})
    return result
