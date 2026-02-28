from sqlalchemy import (
    Column,
    Integer,
    Text,
    Boolean,
    Numeric,
    Date,
    Enum,
    ForeignKey,
    UniqueConstraint,
)
from app.core.database import Base
import enum


# -------------------------
# ENUMS
# -------------------------

class FinanceTypeEnum(str, enum.Enum):
    payment = "payment"
    surcharge = "surcharge"
    refund = "refund"


class FinanceStateEnum(str, enum.Enum):
    requested = "requested"
    rejected = "rejected"
    executed = "executed"


# -------------------------
# FE (FIELD ENGINEER)
# -------------------------

class Fe(Base):
    __tablename__ = "fe"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)

    # comma separated project ids: "1,2,5"
    allowed_project_ids = Column(Text, nullable=False)

    is_active = Column(Boolean, default=True)


# -------------------------
# FE ASSIGNMENT (HISTORY)
# -------------------------

class FeAssignment(Base):
    __tablename__ = "fe_assignment"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "site_id",
            "is_active",
            name="uq_active_assignment_per_site",
        ),
        {"schema": "schema_core"},
    )

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("schema_core.project.id"),
        nullable=False,
    )

    site_id = Column(Integer, nullable=False)

    fe_id = Column(
        Integer,
        ForeignKey("schema_core.fe.id"),
        nullable=False,
    )

    is_active = Column(Boolean, default=True)

    final_fe_cost = Column(Numeric, nullable=True)


# -------------------------
# FINANCE
# -------------------------

class Finance(Base):
    __tablename__ = "finance"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)

    project_id = Column(
        Integer,
        ForeignKey("schema_core.project.id"),
        nullable=False,
    )

    site_id = Column(Integer, nullable=False)

    fe_id = Column(
        Integer,
        ForeignKey("schema_core.fe.id"),
        nullable=True,
    )

    type = Column(Enum(FinanceTypeEnum), nullable=False)

    state = Column(Enum(FinanceStateEnum), nullable=False)

    amount = Column(Numeric, nullable=False)

    approval = Column(Boolean, nullable=True)

    execution_date = Column(Date, nullable=True)
