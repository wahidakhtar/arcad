from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class SiteCreate(BaseModel):
    project_key: str
    subproject_id: int
    data: dict[str, Any]


class SiteUpdate(BaseModel):
    data: dict[str, Any]


class SubprojectCreate(BaseModel):
    project_key: str
    batch_date: str
    rows: list[dict[str, Any]]


class FEAssignmentRequest(BaseModel):
    bucket_id: int
    fe_id: int


class FERemovalRequest(BaseModel):
    final_cost: Optional[Decimal] = None


class SiteFinancials(BaseModel):
    budget: Decimal
    cost: Decimal
    paid: Decimal
    balance: Decimal


class FESummary(BaseModel):
    fe_id: int
    fe_label: str
    bucket_key: str
    active: bool
    cost: Decimal
    paid: Decimal
    balance: Decimal


class SiteOut(BaseModel):
    id: int
    project_key: str
    subproject_id: int
    ckt_id: str
    status_key: str
    receiving_date: date
    fields: dict[str, Any] = Field(default_factory=dict)
    financials: SiteFinancials
    fe_rows: list[FESummary] = Field(default_factory=list)
