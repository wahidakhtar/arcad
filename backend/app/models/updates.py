from __future__ import annotations

from typing import Optional
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Update(Base):
    __tablename__ = "updates"
    __table_args__ = {"schema": "schema_updates"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    update: Mapped[str] = mapped_column(Text, nullable=False)
    followup_date: Optional[Mapped[date]] = mapped_column(Date)
    update_type: Mapped[str] = mapped_column(String(16), nullable=False, default="ops")

