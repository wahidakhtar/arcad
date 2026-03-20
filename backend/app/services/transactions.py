from __future__ import annotations

from typing import Optional
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, update
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


def _tx_to_dict(tx: Transaction) -> dict:
    return {
        "id": tx.id,
        "request_date": tx.request_date,
        "recipient_id": tx.recipient_id,
        "type_id": tx.type_id,
        "project_id": tx.project_id,
        "site_id": tx.site_id,
        "bucket_key": tx.bucket_key,
        "amount": tx.amount,
        "status_id": tx.status_id,
        "execution_date": tx.execution_date,
        "remarks": tx.remarks,
        "version": tx.version,
        "cancelled": tx.deleted_at is not None,
    }


def list_transactions(db: Session, user: UserContext) -> list[dict]:
    # Return ALL rows (including soft-deleted) for audit trail; frontend shows them greyed out
    query = select(Transaction).order_by(Transaction.request_date.desc())

    if user.is_fo:
        query = query.where(Transaction.recipient_id == user.user_id)
    else:
        project_ids = user_project_ids(user)
        if project_ids is not None:
            query = query.where(Transaction.project_id.in_(project_ids))

    return [_tx_to_dict(tx) for tx in db.execute(query).scalars().all()]


def create_transaction(db: Session, payload: TransactionCreate) -> Transaction:
    requested_status = db.execute(select(Badge).where(Badge.key == "req")).scalar_one_or_none()
    if requested_status is None:
        raise HTTPException(status_code=400, detail="Requested transaction status is not configured")
    row = Transaction(request_date=date.today(), status_id=requested_status.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def cancel_transaction(db: Session, user: UserContext, transaction_id: int, version: int) -> dict:
    """Soft-delete a transaction. Only mgmt l3, ops l2, ops l3 may cancel."""
    can_cancel = any(
        (r.dept_key == "mgmt" and r.level_key == "l3")
        or (r.dept_key == "ops" and r.level_key in {"l2", "l3"})
        for r in user.roles
    )
    if not can_cancel:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Look up the requested-status badge id
    req_badge = db.execute(select(Badge).where(Badge.key == "req")).scalar_one_or_none()
    if req_badge is None:
        raise HTTPException(status_code=500, detail="Requested badge not configured")

    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.status_id != req_badge.id:
        raise HTTPException(status_code=409, detail="Transaction has already been executed or rejected")

    # Optimistic lock: SET deleted_at=now(), deleted_by=user WHERE id=? AND version=? AND deleted_at IS NULL
    result = db.execute(
        update(Transaction)
        .where(
            Transaction.id == transaction_id,
            Transaction.version == version,
            Transaction.deleted_at.is_(None),
            Transaction.status_id == req_badge.id,
        )
        .values(
            deleted_at=datetime.now(timezone.utc),
            deleted_by=user.user_id,
            version=Transaction.version + 1,
        )
        .returning(Transaction)
    )
    updated = result.scalars().first()
    if updated is None:
        raise HTTPException(status_code=409, detail="Transaction was modified by another user — please refresh and try again")

    db.commit()
    db.refresh(updated)
    return _tx_to_dict(updated)


def update_status(db: Session, transaction_id: int, status_id: int, execution_date: Optional[date]) -> Transaction:
    row = db.get(Transaction, transaction_id)
    row.status_id = status_id
    row.execution_date = execution_date
    db.commit()
    db.refresh(row)
    return row
