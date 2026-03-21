from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user, permission_required
from app.core.database import get_db
from app.schemas.transaction import StatusUpdate, TransactionCreate
from app.services import transactions as transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/transitions", dependencies=[Depends(permission_required("transaction", "read"))])
def list_transitions(db: Session = Depends(get_db)):
    return transaction_service.list_transitions(db)


@router.get("")
def list_transactions(user: UserContext = Depends(permission_required("transaction", "read")), db: Session = Depends(get_db)):
    return transaction_service.list_transactions(db, user)


@router.post("", dependencies=[Depends(permission_required("request", "write"))])
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    return transaction_service.create_transaction(db, payload)


@router.patch("/{transaction_id}/status")
def update_status(
    transaction_id: int,
    payload: StatusUpdate,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return transaction_service.update_status(
        db, user, transaction_id, payload.status_id, payload.version, payload.execution_date
    )
