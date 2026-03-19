from __future__ import annotations

from typing import Optional
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.core import Badge
from app.models.acc import Transaction
from app.schemas.transaction import TransactionCreate


def list_transactions(db: Session) -> list[Transaction]:
    return db.execute(select(Transaction).order_by(Transaction.request_date.desc())).scalars().all()


def create_transaction(db: Session, payload: TransactionCreate) -> Transaction:
    requested_status = db.execute(select(Badge).where(Badge.key == "req")).scalar_one_or_none()
    if requested_status is None:
        raise HTTPException(status_code=400, detail="Requested transaction status is not configured")
    row = Transaction(request_date=date.today(), status_id=requested_status.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_status(db: Session, transaction_id: int, status_id: int, execution_date: Optional[date]) -> Transaction:
    row = db.get(Transaction, transaction_id)
    row.status_id = status_id
    row.execution_date = execution_date
    db.commit()
    db.refresh(row)
    return row
