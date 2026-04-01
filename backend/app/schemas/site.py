from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    key: str
    label: str


class SiteCreate(BaseModel):
    project_key: str
    subproject_id: Optional[int] = None
    data: dict[str, Any]


class SiteUpdate(BaseModel):
    data: dict[str, Any]


class SubprojectCreate(BaseModel):
    project_key: str
    batch_date: str
    rows: list[dict[str, Any]]


class SubconAssignmentRequest(BaseModel):
    subcon_id: int
    bucket_id: Optional[int] = None


class FERemovalRequest(BaseModel):
    final_cost: Decimal


class RechargeRequestCreate(BaseModel):
    amount: Decimal
    validity: int
    uom: str


class SiteFinancials(BaseModel):
    budget: Decimal
    cost: Decimal
    paid: Decimal
    balance: Optional[Decimal] = None


class SubconSummary(BaseModel):
    assignment_id: int
    subcon_id: int
    subcon_label: str
    bucket_key: str
    active: bool
    cost: Decimal
    paid: Decimal
    balance: Optional[Decimal] = None


class SiteOut(BaseModel):
    id: int
    project_id: int
    project_key: str
    subproject_id: int
    ckt_id: str
    status_key: str
    receiving_date: date
    fields: dict[str, Any] = Field(default_factory=dict)
    financials: SiteFinancials
    subcon_rows: list[SubconSummary] = Field(default_factory=list)
