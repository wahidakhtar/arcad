from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.auth import UserContext
from app.models.updates import Update

# Department badge IDs (from schema_core.badges)
_OPS_DEPT_ID = 3
_ACC_DEPT_ID = 2


def _dept_id_for_user(user: UserContext) -> int:
    """Auto-resolve dept_id from the posting user's department."""
    if any(role.dept_key == "acc" for role in user.roles):
        return _ACC_DEPT_ID
    return _OPS_DEPT_ID


def list_updates(db: Session, site_id: int, user: UserContext) -> list[Update]:
    """Return updates filtered by the user's tag permissions.

    - update read  → sees ops rows (dept_id=3)
    - acc_update read → sees acc/finance rows (dept_id=2)
    - Both         → sees all rows
    - Neither      → empty list
    """
    has_update = any(
        rd for (rid, tag), (rd, _) in user.permission_map.items()
        if tag == "update" and rd and rid in {role.role_id for role in user.roles}
    )
    has_acc_update = any(
        rd for (rid, tag), (rd, _) in user.permission_map.items()
        if tag == "acc_update" and rd and rid in {role.role_id for role in user.roles}
    )

    query = select(Update).where(Update.site_id == site_id)

    if has_update and has_acc_update:
        pass  # no filter — see everything
    elif has_update:
        query = query.where(Update.dept_id == _OPS_DEPT_ID)
    elif has_acc_update:
        query = query.where(Update.dept_id == _ACC_DEPT_ID)
    else:
        return []

    return db.execute(query.order_by(Update.date.desc())).scalars().all()


def create_update(db: Session, data: dict, user: UserContext) -> Update:
    data = dict(data)
    data["dept_id"] = _dept_id_for_user(user)
    row = Update(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
