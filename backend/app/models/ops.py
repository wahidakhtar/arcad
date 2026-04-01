from __future__ import annotations

from typing import Optional
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Time, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SubconType(Base):
    __tablename__ = "subcon_types"
    __table_args__ = {"schema": "schema_ops"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)


class Subcon(Base):
    __tablename__ = "subcons"
    __table_args__ = {"schema": "schema_ops"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    subcon_type_id: Mapped[int] = mapped_column(ForeignKey("schema_ops.subcon_types.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SubconProject(Base):
    __tablename__ = "subcon_projects"
    __table_args__ = {"schema": "schema_ops"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subcon_id: Mapped[int] = mapped_column(ForeignKey("schema_ops.subcons.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)


class SubconAssignment(Base):
    __tablename__ = "subcon_assignments"
    __table_args__ = (
        Index("ix_subcon_assignments_site_id", "site_id"),
        Index(
            "ux_project_site_one_active_subcon",
            "project_id",
            "site_id",
            unique=True,
            postgresql_where=text("active = TRUE"),
        ),
        {"schema": "schema_ops"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Mapped[int] = mapped_column(Integer, nullable=False)
    bucket_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_core.job_buckets.id"))
    subcon_id: Mapped[int] = mapped_column(ForeignKey("schema_ops.subcons.id"), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_by: Optional[Mapped[int]] = mapped_column(Integer)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    removed_at: Optional[Mapped[datetime]] = mapped_column(DateTime)
    removed_cost: Optional[Mapped[float]] = mapped_column(Numeric(12, 2))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


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
    closing_date: Optional[Mapped[date]] = mapped_column(Date)
    closing_time: Optional[Mapped[time]] = mapped_column(Time)


class PunchPoint(Base):
    __tablename__ = "punch_point"
    __table_args__ = {"schema": "schema_ops"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)


class TicketPunchPoint(Base):
    __tablename__ = "ticket_punch_points"
    __table_args__ = {"schema": "schema_ops"}

    ticket_id: Mapped[int] = mapped_column(ForeignKey("schema_ops.tickets.id"), primary_key=True)
    punch_point_id: Mapped[int] = mapped_column(ForeignKey("schema_ops.punch_point.id"), primary_key=True)
