from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.auth import UserContext
from app.models.updates import Update


def _update_type_for_user(user: UserContext) -> str:
    """Auto-resolve update_type from the posting user's department."""
    if any(role.dept_key == "acc" for role in user.roles):
        return "finance"
    return "ops"


def list_updates(db: Session, site_id: int, user: UserContext) -> list[Update]:
    """Return updates filtered by the user's tag permissions.

    - update read  → sees ops rows
    - acc_update read → sees finance rows
    - Both         → sees all rows (e.g. mgmt l3)
    - Neither      → empty list (caller should have already 403'd)
    """
    has_update = any(
        r for (rid, tag), (rd, _) in user.permission_map.items()
        if tag == "update" and rd and rid in {role.role_id for role in user.roles}
    )
    has_acc_update = any(
        r for (rid, tag), (rd, _) in user.permission_map.items()
        if tag == "acc_update" and rd and rid in {role.role_id for role in user.roles}
    )

    query = select(Update).where(Update.site_id == site_id)

    if has_update and has_acc_update:
        pass  # no filter — see everything
    elif has_update:
        query = query.where(Update.update_type == "ops")
    elif has_acc_update:
        query = query.where(Update.update_type == "finance")
    else:
        return []

    return db.execute(query.order_by(Update.date.desc())).scalars().all()


def create_update(db: Session, data: dict, user: UserContext) -> Update:
    data = dict(data)
    data["update_type"] = _update_type_for_user(user)
    row = Update(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
