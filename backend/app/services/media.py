from __future__ import annotations

from typing import Optional
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.media import MAMedia, MCMedia
from app.services.common import ensure_media_dir


def _get_media_model(project_key: str):
    if project_key == "ma":
        return MAMedia
    if project_key == "mc":
        return MCMedia
    raise ValueError(f"Media not supported for project: {project_key}")


def list_media(db: Session, project_key: str, site_id: int) -> list:
    model = _get_media_model(project_key)
    return db.execute(
        select(model).where(model.site_id == site_id).order_by(model.sequence_order.asc(), model.id.asc())
    ).scalars().all()


def save_media(db: Session, project_key: str, site_id: int, uploaded_by: int, filename: str, content: bytes, caption: Optional[str], sequence_order: Optional[int]):
    model = _get_media_model(project_key)
    settings = get_settings()
    media_dir = ensure_media_dir(settings.media_root, project_key, site_id)
    file_path = media_dir / filename
    file_path.write_bytes(content)
    row = model(site_id=site_id, uploaded_by=uploaded_by, file_path=str(file_path), caption=caption, sequence_order=sequence_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
