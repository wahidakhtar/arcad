from __future__ import annotations

from typing import Optional
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from sqlalchemy import text
from app.api.auth import UserContext, user_project_ids
from app.models.core import Badge
from app.models.acc import Transaction
from app.schemas.transaction import TransactionCreate


def list_transitions(db: Session) -> list[dict]:
    """Return allowed transaction badge transitions from schema_acc."""
    rows = db.execute(
        text(
            """
            SELECT bt.from_id, b_from.key AS from_key, bt.to_id, b_to.key AS to_key, b_to.label AS to_label
            FROM schema_acc.badge_transitions bt
            JOIN schema_core.transition_types tt ON tt.id = bt.type_id
            JOIN schema_core.badges b_from ON b_from.id = bt.from_id
            JOIN schema_core.badges b_to ON b_to.id = bt.to_id
            WHERE tt.key = 'transaction'
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]


def list_transactions(db: Session, user: UserContext) -> list[Transaction]:
    query = select(Transaction).order_by(Transaction.request_date.desc())

    if user.is_fo:
        # Amendment 3: FO sees only own transactions (recipient_id = user_id)
        query = query.where(Transaction.recipient_id == user.user_id)
    else:
        project_ids = user_project_ids(user)
        if project_ids is not None:
            # Ops and other project-scoped roles: filter by assigned projects
            query = query.where(Transaction.project_id.in_(project_ids))
        # Global-scope users (mgmt, acc): no filter — see all

    return db.execute(query).scalars().all()


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
