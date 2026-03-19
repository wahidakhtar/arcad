from __future__ import annotations

from typing import Optional
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from sqlalchemy import text
from app.models.core import Badge
from app.models.acc import Transaction
from app.schemas.transaction import TransactionCreate


def list_transitions(db: Session) -> list[dict]:
    """Return allowed transaction badge transitions.
    Tries schema_acc first, then project schemas as fallback."""
    for schema in ("schema_acc", "schema_mi", "schema_md", "schema_ma", "schema_mc"):
        try:
            rows = db.execute(
                text(
                    f"""
                    SELECT bt.from_id, b_from.key AS from_key, bt.to_id, b_to.key AS to_key, b_to.label AS to_label
                    FROM {schema}.badge_transitions bt
                    JOIN schema_core.transition_types tt ON tt.id = bt.type_id
                    JOIN schema_core.badges b_from ON b_from.id = bt.from_id
                    JOIN schema_core.badges b_to ON b_to.id = bt.to_id
                    WHERE tt.key = 'transaction'
                    """
                )
            ).mappings().all()
            result = [dict(row) for row in rows]
            if result:
                return result
        except Exception:
            db.rollback()
    return []


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
