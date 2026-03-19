from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.schemas.transaction import StatusUpdate, TransactionCreate
from app.services import transactions as transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", dependencies=[Depends(permission_required("transaction", "read"))])
def list_transactions(db: Session = Depends(get_db)):
    return transaction_service.list_transactions(db)


@router.post("", dependencies=[Depends(permission_required("transaction", "write"))])
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    return transaction_service.create_transaction(db, payload)


@router.patch("/{transaction_id}/status", dependencies=[Depends(permission_required("transaction", "write"))])
def update_status(transaction_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    return transaction_service.update_status(db, transaction_id, payload.status_id, payload.execution_date)
