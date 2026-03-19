from __future__ import annotations

from typing import Optional
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SiteMedia(Base):
    __tablename__ = "site_media"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    site_id: Mapped[int] = mapped_column(Integer, nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("schema_hr.users.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    caption: Optional[Mapped[str]] = mapped_column(String(255))
    sequence_order: Optional[Mapped[int]] = mapped_column(Integer)

