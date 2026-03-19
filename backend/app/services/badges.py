from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.core import Badge


def list_badges(db: Session, badge_type: Optional[str] = None) -> list[Badge]:
    query = select(Badge).order_by(Badge.id.asc())
    if badge_type:
        query = query.where(Badge.type == badge_type)
    return db.execute(query).scalars().all()
