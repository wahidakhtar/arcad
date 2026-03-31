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
from app.models.ops import SubconAssignment, Subcon
from app.models.hr import User
from app.services.common import get_recipient_type_id
from app.services import acc_rules
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
        "recipient_type_id": tx.recipient_type_id,
        "recipient_id": tx.recipient_id,
        "type_id": tx.type_id,
        "project_id": tx.project_id,
        "site_id": tx.site_id,
        "amount": tx.amount,
        "status_id": tx.status_id,
        "execution_date": tx.execution_date,
        "remarks": tx.remarks,
        "recipient_label": None,
        "version": tx.version,
    }


def _is_ops_l1_only(user: UserContext) -> bool:
    """Return True if all of the user's roles are ops l1."""
    return bool(user.roles) and all(
        r.dept_key == "ops" and r.level_key == "l1" for r in user.roles
    )


def get_transaction(db: Session, user: UserContext, transaction_id: int) -> dict | None:
    if _is_ops_l1_only(user):
        return None

    conditions = ["t.id = :tx_id"]
    params: dict = {"tx_id": transaction_id}

    if user.is_fo:
        conditions.append("t.recipient_id = :user_id")
        params["user_id"] = user.user_id
    else:
        project_ids = user_project_ids(user)
        if project_ids is not None:
            conditions.append("t.project_id = ANY(:project_ids)")
            params["project_ids"] = project_ids

    where_clause = " AND ".join(conditions)
    row = db.execute(
        text(f"""
            SELECT t.id, t.request_date, t.recipient_type_id, t.recipient_id, t.type_id,
                   t.project_id, t.site_id, t.amount, t.status_id, t.execution_date,
                   t.remarks, t.version,
                   CASE
                       WHEN r.key = 'user' THEN u.label
                       WHEN r.key = 'subcon' THEN s.name
                       WHEN t.site_id IS NOT NULL THEN s.name
                       ELSE COALESCE(u.label, s.name, r.label)
                   END AS recipient_label,
                   r.key AS recipient_type_key,
                   u.label AS user_name, s.name AS subcon_name
            FROM schema_acc.transactions t
            LEFT JOIN schema_core.recipients r ON r.id = t.recipient_type_id
            LEFT JOIN schema_hr.users u ON u.id = t.recipient_id
            LEFT JOIN schema_ops.subcons s ON s.id = t.recipient_id
            WHERE {where_clause}
        """),
        params,
    ).mappings().one_or_none()
    return dict(row) if row else None


def list_transactions(db: Session, user: UserContext, page: int = 1, page_size: int = 50) -> dict:
    # ops l1 users see no transactions at all
    if _is_ops_l1_only(user):
        return {"items": [], "total": 0, "page": 1, "page_size": page_size, "pages": 1}

    conditions = ["1=1"]
    params: dict = {}

    if user.is_fo:
        conditions.append("t.recipient_id = :user_id")
        params["user_id"] = user.user_id
    else:
        project_ids = user_project_ids(user)
        if project_ids is not None:
            conditions.append("t.project_id = ANY(:project_ids)")
            params["project_ids"] = project_ids

    where_clause = " AND ".join(conditions)
    count_row = db.execute(
        text(f"SELECT COUNT(*) FROM schema_acc.transactions t WHERE {where_clause}"),
        params,
    ).scalar_one()
    total = int(count_row)
    page_size = max(1, page_size)
    pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, pages))
    offset = (page - 1) * page_size
    params_paged = {**params, "limit": page_size, "offset": offset}
    rows = db.execute(
        text(f"""
            SELECT t.id, t.request_date, t.recipient_type_id, t.recipient_id, t.type_id,
                   t.project_id, t.site_id, t.amount, t.status_id, t.execution_date,
                   t.remarks, t.version,
                   CASE
                       WHEN r.key = 'user' THEN u.label
                       WHEN r.key = 'subcon' THEN s.name
                       WHEN t.site_id IS NOT NULL THEN s.name
                       ELSE COALESCE(u.label, s.name, r.label)
                   END AS recipient_label,
                   r.key AS recipient_type_key,
                   u.label AS user_name, s.name AS subcon_name
            FROM schema_acc.transactions t
            LEFT JOIN schema_core.recipients r ON r.id = t.recipient_type_id
            LEFT JOIN schema_hr.users u ON u.id = t.recipient_id
            LEFT JOIN schema_ops.subcons s ON s.id = t.recipient_id
            WHERE {where_clause}
            ORDER BY t.request_date DESC
            LIMIT :limit OFFSET :offset
        """),
        params_paged,
    ).mappings().all()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": page_size, "pages": pages}


def create_transaction(db: Session, payload: TransactionCreate) -> Transaction:
    requested_status = db.execute(select(Badge).where(Badge.key == "req")).scalar_one_or_none()
    if requested_status is None:
        raise HTTPException(status_code=400, detail="Requested transaction status is not configured")
    payload_data = payload.model_dump()
    recharge_validity = payload_data.pop("recharge_validity", None)
    recharge_uom = payload_data.pop("recharge_uom", None)
    if payload_data.get("recipient_type_id") is None and payload_data.get("recipient_id") is not None:
        recipient_id = payload_data["recipient_id"]
        site_id = payload_data.get("site_id")
        project_id = payload_data.get("project_id")
        if site_id is not None and project_id is not None:
            subcon_match = db.execute(
                select(SubconAssignment).where(
                    SubconAssignment.project_id == project_id,
                    SubconAssignment.site_id == site_id,
                    SubconAssignment.subcon_id == recipient_id,
                )
            ).scalar_one_or_none()
            if subcon_match is not None:
                payload_data["recipient_type_id"] = get_recipient_type_id(db, "subcon")
        if payload_data.get("recipient_type_id") is None and db.get(Subcon, recipient_id) is not None:
            payload_data["recipient_type_id"] = get_recipient_type_id(db, "subcon")
        if payload_data.get("recipient_type_id") is None and db.get(User, recipient_id) is not None:
            payload_data["recipient_type_id"] = get_recipient_type_id(db, "user")

    type_badge = db.get(Badge, payload_data["type_id"])
    is_bb_recharge = (
        type_badge is not None
        and type_badge.key == "rec"
        and payload_data.get("project_id") == acc_rules._bb_project_id(db)
    )

    if is_bb_recharge:
        from app.models.bb import BBSite

        site_id = payload_data.get("site_id")
        if site_id is None:
            raise HTTPException(status_code=400, detail="site_id is required for BB recharge requests")
        if db.get(BBSite, site_id) is None:
            raise HTTPException(status_code=404, detail="BB site not found")
        if recharge_validity is None or recharge_uom is None:
            raise HTTPException(status_code=400, detail="recharge_validity and recharge_uom are required for BB recharge requests")
        if recharge_validity <= 0:
            raise HTTPException(status_code=400, detail="recharge_validity must be greater than 0")
        if recharge_uom not in {"months", "days"}:
            raise HTTPException(status_code=400, detail="recharge_uom must be 'months' or 'days'")
        if acc_rules._is_bb_site_terminated(db, site_id):
            raise HTTPException(status_code=400, detail="Cannot request recharge for a terminated BB site")

    row = Transaction(request_date=date.today(), status_id=requested_status.id, **payload_data)
    db.add(row)
    db.flush()
    if is_bb_recharge:
        acc_rules.create_bb_recharge_request(
            db,
            row.id,
            payload_data["site_id"],
            row.amount,
            recharge_validity,
            recharge_uom == "months",
        )
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
    type_badge = db.get(Badge, tx.type_id)
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
        requires_execution_date = type_badge is None or type_badge.key not in {"b_sur", "e_sur"}
        if target_key == "exct" and requires_execution_date and execution_date is None:
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

    if type_badge is not None and type_badge.key == "rec" and updated.project_id == acc_rules._bb_project_id(db):
        if target_key == "exct":
            acc_rules.sync_bb_recharge_for_executed_transaction(db, updated)
        elif target_key in {"rej", "cancel"}:
            acc_rules.clear_bb_recharge_request(db, updated.id)

    db.commit()
    db.refresh(updated)
    return _tx_to_dict(updated)
