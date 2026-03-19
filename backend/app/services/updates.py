from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.updates import Update


def list_updates(db: Session, site_id: int) -> list[Update]:
    return db.execute(select(Update).where(Update.site_id == site_id).order_by(Update.date.desc())).scalars().all()


def create_update(db: Session, data: dict) -> Update:
    row = Update(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
