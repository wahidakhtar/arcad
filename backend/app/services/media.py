from __future__ import annotations

from typing import Optional
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.media import SiteMedia
from app.services.common import get_project
from app.services.common import ensure_media_dir


def list_media(db: Session, site_id: int) -> list[SiteMedia]:
    return db.execute(select(SiteMedia).where(SiteMedia.site_id == site_id).order_by(SiteMedia.sequence_order.asc(), SiteMedia.id.asc())).scalars().all()


def save_media(db: Session, project_key: str, site_id: int, uploaded_by: int, filename: str, content: bytes, caption: Optional[str], sequence_order: Optional[int]) -> SiteMedia:
    settings = get_settings()
    media_dir = ensure_media_dir(settings.media_root, project_key, site_id)
    file_path = media_dir / filename
    file_path.write_bytes(content)
    project = get_project(db, project_key)
    row = SiteMedia(site_id=site_id, project_id=project.id, uploaded_by=uploaded_by, file_path=str(file_path), caption=caption, sequence_order=sequence_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
