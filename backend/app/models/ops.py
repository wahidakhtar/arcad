from __future__ import annotations

from typing import Optional
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FEAssignment(Base):
    __tablename__ = "fe_assignment"
    __table_args__ = (
        Index("ix_fe_assignment_site_id", "site_id"),
        {"schema": "schema_ops"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Mapped[int] = mapped_column(Integer, nullable=False)
    bucket_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_core.job_buckets.id"))
    fe_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_hr.users.id"))
    provider_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_bb.providers.id"))
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    final_cost: Optional[Mapped[Decimal]] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        Index("ix_tickets_site_id", "site_id"),
        {"schema": "schema_ops"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_number: Optional[Mapped[str]] = mapped_column(String(128))
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Mapped[int] = mapped_column(Integer, nullable=False)
    ticket_date: Mapped[date] = mapped_column(Date, nullable=False)
    ticket_time: Optional[Mapped[time]] = mapped_column(Time)
    pp_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_ops.punch_point.id"))
    rfo: Optional[Mapped[str]] = mapped_column(String(255))
    closing_date: Optional[Mapped[date]] = mapped_column(Date)
    closing_time: Optional[Mapped[time]] = mapped_column(Time)


class PunchPoint(Base):
    __tablename__ = "punch_point"
    __table_args__ = {"schema": "schema_ops"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)

