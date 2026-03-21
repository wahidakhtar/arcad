from __future__ import annotations

from typing import Optional
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from sqlalchemy import text
from app.api.auth import UserContext, check_permission, user_project_ids
from app.models.core import Badge
from app.models.acc import Transaction
from app.schemas.transaction import TransactionCreate

# Status keys that allow no further transitions
_TERMINAL_KEYS = {"exct", "rej", "cancel"}


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
    }


def _is_ops_l1_only(user: UserContext) -> bool:
    """Return True if all of the user's roles are ops l1."""
    return bool(user.roles) and all(
        r.dept_key == "ops" and r.level_key == "l1" for r in user.roles
    )


def list_transactions(db: Session, user: UserContext) -> list[dict]:
    # ops l1 users see no transactions at all
    if _is_ops_l1_only(user):
        return []

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


def update_status(
    db: Session,
    user: UserContext,
    transaction_id: int,
    status_id: int,
    version: int,
    execution_date: Optional[date],
) -> dict:
    """
    Transition a transaction to a new status.

    req → cancel:   requires request write. Version check.
    req → exct:     requires transaction write. execution_date required. Version check.
    req → rej:      requires transaction write. Version check.
    executed/rejected/cancelled → any: 409 No further action allowed.
    """
    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    current_badge = db.get(Badge, tx.status_id)
    target_badge = db.get(Badge, status_id)
    if target_badge is None:
        raise HTTPException(status_code=400, detail="Invalid target status")

    if current_badge is not None and current_badge.key in _TERMINAL_KEYS:
        raise HTTPException(status_code=409, detail="No further action allowed")

    target_key = target_badge.key

    if target_key == "cancel":
        if not check_permission(user, None, "request", "write", db):
            raise HTTPException(status_code=403, detail="write access denied for request")
    elif target_key in ("exct", "rej"):
        if not check_permission(user, None, "transaction", "write", db):
            raise HTTPException(status_code=403, detail="write access denied for transaction")
        if target_key == "exct" and execution_date is None:
            raise HTTPException(status_code=400, detail="execution_date is required for executed status")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported target status: {target_key}")

    req_badge = db.execute(select(Badge).where(Badge.key == "req")).scalar_one_or_none()
    if req_badge is None:
        raise HTTPException(status_code=500, detail="Requested badge not configured")

    update_values: dict = {
        "status_id": status_id,
        "version": Transaction.version + 1,
    }
    if execution_date is not None:
        update_values["execution_date"] = execution_date

    result = db.execute(
        update(Transaction)
        .where(
            Transaction.id == transaction_id,
            Transaction.version == version,
            Transaction.status_id == req_badge.id,
        )
        .values(**update_values)
        .returning(Transaction)
    )
    updated = result.scalars().first()
    if updated is None:
        raise HTTPException(
            status_code=409,
            detail="Transaction was modified by another user",
        )

    db.commit()
    db.refresh(updated)
    return _tx_to_dict(updated)
