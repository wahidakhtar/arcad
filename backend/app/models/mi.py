from __future__ import annotations

from typing import Optional
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MISubproject(Base):
    __tablename__ = "subprojects"
    __table_args__ = {"schema": "schema_mi"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_date: Optional[Mapped[date]] = mapped_column(Date)
    bucket: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class MISite(Base):
    __tablename__ = "sites"
    __table_args__ = {"schema": "schema_mi"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subproject_id: Mapped[int] = mapped_column(ForeignKey("schema_mi.subprojects.id"), nullable=False)
    receiving_date: Mapped[date] = mapped_column(Date, nullable=False)
    ckt_id: Mapped[str] = mapped_column(String(64), nullable=False)
    customer: Optional[Mapped[str]] = mapped_column(String(255))
    height: Optional[Mapped[Decimal]] = mapped_column(Numeric(10, 2))
    address: Optional[Mapped[str]] = mapped_column(Text)
    lc: Optional[Mapped[str]] = mapped_column(String(255))
    permission_date: Optional[Mapped[date]] = mapped_column(Date)
    status_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    followup_date: Optional[Mapped[date]] = mapped_column(Date)
    city: Optional[Mapped[str]] = mapped_column(String(255))
    edd: Optional[Mapped[date]] = mapped_column(Date)
    completion_date: Optional[Mapped[date]] = mapped_column(Date)
    wcc_status_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_core.badges.id"))
    po_number: Optional[Mapped[str]] = mapped_column(String(128))
    invoice_number: Optional[Mapped[str]] = mapped_column(String(128))
    active_fe: Optional[Mapped[str]] = mapped_column(String(256))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class MIUIField(Base):
    __tablename__ = "ui_fields"
    __table_args__ = {"schema": "schema_mi"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    tag: Mapped[str] = mapped_column(String(64), nullable=False)
    list_view: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)


class MIBadgeTransition(Base):
    __tablename__ = "badge_transitions"
    __table_args__ = {"schema": "schema_mi"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type_id: Mapped[int] = mapped_column(ForeignKey("schema_core.transition_types.id"), nullable=False)
    from_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    to_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)

