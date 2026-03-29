from __future__ import annotations

from typing import Optional
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BBSubproject(Base):
    __tablename__ = "subprojects"
    __table_args__ = {"schema": "schema_bb"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_date: Optional[Mapped[date]] = mapped_column(Date)
    bucket: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BBSite(Base):
    __tablename__ = "sites"
    __table_args__ = {"schema": "schema_bb"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subproject_id: Mapped[int] = mapped_column(ForeignKey("schema_bb.subprojects.id"), nullable=False)
    receiving_date: Mapped[date] = mapped_column(Date, nullable=False)
    ckt_id: Mapped[str] = mapped_column(String(64), nullable=False)
    customer: Optional[Mapped[str]] = mapped_column(String(255))
    address: Optional[Mapped[str]] = mapped_column(Text)
    city: Optional[Mapped[str]] = mapped_column(String(255))
    lc: Optional[Mapped[str]] = mapped_column(String(255))
    status_id: Mapped[int] = mapped_column(ForeignKey("schema_core.badges.id"), nullable=False)
    username: Optional[Mapped[str]] = mapped_column(String(255))
    password: Optional[Mapped[str]] = mapped_column(String(255))
    po_number: Optional[Mapped[str]] = mapped_column(String(128))
    invoice_number: Optional[Mapped[str]] = mapped_column(String(128))
    active_fe: Optional[Mapped[str]] = mapped_column(String(256))
    active_provider: Optional[Mapped[str]] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class BBUIField(Base):
    __tablename__ = "ui_fields"
    __table_args__ = {"schema": "schema_bb"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    list_view: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)


class Recharge(Base):
    __tablename__ = "recharges"
    __table_args__ = {"schema": "schema_bb"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("schema_bb.sites.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    validity: Mapped[int] = mapped_column(Integer, nullable=False)
    months: Mapped[bool] = mapped_column(Boolean, nullable=False)
    next_recharge_date: Optional[Mapped[date]] = mapped_column(Date, nullable=True)


class Termination(Base):
    __tablename__ = "terminations"
    __table_args__ = {"schema": "schema_bb"}

    site_id: Mapped[int] = mapped_column(ForeignKey("schema_bb.sites.id"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
