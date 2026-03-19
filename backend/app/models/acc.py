from __future__ import annotations

from typing import Optional
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PO(Base):
    __tablename__ = "pos"
    __table_args__ = {"schema": "schema_acc"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Optional[Mapped[int]] = mapped_column(Integer)
    entity_id: Optional[Mapped[str]] = mapped_column(String(128))
    po_date: Optional[Mapped[date]] = mapped_column(Date)
    po_no: Optional[Mapped[str]] = mapped_column(String(128))
    period_from: Optional[Mapped[date]] = mapped_column(Date)
    period_to: Optional[Mapped[date]] = mapped_column(Date)
    po_status_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = {"schema": "schema_acc"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("schema_acc.pos.id"), nullable=False)
    invoice_no: Optional[Mapped[str]] = mapped_column(String(128))
    submission_date: Optional[Mapped[date]] = mapped_column(Date)
    settlement_date: Optional[Mapped[date]] = mapped_column(Date)
    invoice_status_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_project_site", "project_id", "site_id"),
        Index("ix_transactions_status_id", "status_id"),
        Index("ix_transactions_recipient_id", "recipient_id"),
        {"schema": "schema_acc"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_date: Mapped[date] = mapped_column(Date, nullable=False)
    recipient_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_hr.users.id"))
    type_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("schema_core.projects.id"), nullable=False)
    site_id: Optional[Mapped[int]] = mapped_column(Integer)
    bucket_key: Optional[Mapped[str]] = mapped_column(String(32))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    execution_date: Optional[Mapped[date]] = mapped_column(Date)
    remarks: Optional[Mapped[str]] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class RateCard(Base):
    __tablename__ = "rate_card"
    __table_args__ = {"schema": "schema_acc"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("schema_core.jobs.id"), nullable=False)
    job_key: Mapped[str] = mapped_column(String(32), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

