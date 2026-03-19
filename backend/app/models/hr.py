from __future__ import annotations

from typing import Optional
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "schema_hr"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    dept_key: Mapped[str] = mapped_column(String(32), nullable=False)
    level_key: Mapped[str] = mapped_column(String(32), nullable=False)
    global_scope: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "schema_hr"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    hash: Mapped[str] = mapped_column(String(255), nullable=False)
    aadhaar: Optional[Mapped[str]] = mapped_column(String(32))
    upi: Optional[Mapped[str]] = mapped_column(String(255))
    ctc: Optional[Mapped[str]] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = {"schema": "schema_hr"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("schema_hr.users.id"), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("schema_hr.roles.id"), nullable=False)
    project_id: Optional[Mapped[int]] = mapped_column(ForeignKey("schema_core.projects.id"))

