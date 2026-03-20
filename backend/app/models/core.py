from __future__ import annotations

from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    supports_subprojects: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Badge(Base):
    __tablename__ = "badges"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Optional[Mapped[str]] = mapped_column(String(16))


class PermissionTag(Base):
    __tablename__ = "permission_tags"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tag: Mapped[str] = mapped_column(String(64), nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    write: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class JobBucket(Base):
    __tablename__ = "job_buckets"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_bucket_id: Mapped[int] = mapped_column(ForeignKey("schema_core.job_buckets.id"), nullable=False)
    bucket_key: Mapped[str] = mapped_column(String(32), nullable=False)
    job_key: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    scale_by: Mapped[str] = mapped_column(String(16), nullable=False, default="unit")


class IndianState(Base):
    __tablename__ = "indian_states"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)


class TransitionType(Base):
    __tablename__ = "transition_types"
    __table_args__ = {"schema": "schema_core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)

