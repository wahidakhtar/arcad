from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class SubconProjectAssignRequest(BaseModel):
    project_id: int


class SubconCreate(BaseModel):
    name: str
    subcon_type_id: int
    is_active: bool = True


class SubconProjectOut(BaseModel):
    id: int
    key: str
    label: str


class SubconOut(BaseModel):
    id: int
    name: str
    subcon_type_id: int
    subcon_type_key: str
    subcon_type_label: str
    is_active: bool
    created_at: datetime
    projects: list[SubconProjectOut] = Field(default_factory=list)


class SubconSummaryOut(BaseModel):
    id: int
    name: str
    subcon_type_id: int
    subcon_type_key: str
    subcon_type_label: str
    is_active: bool
    created_at: datetime


class SubconAssignedSiteOut(BaseModel):
    project_name: str
    circuit_id: str | None
    status: str
    cost: Decimal
    paid: Decimal
    balance: Decimal


class SubconTransactionOut(BaseModel):
    request_date: Optional[date]
    execution_date: Optional[date]
    amount: Decimal
    status: str
    project_or_subproject: str


class SubconDetailOut(BaseModel):
    subcon: SubconSummaryOut
    assigned_projects: list[SubconProjectOut] = Field(default_factory=list)
    assigned_sites: list[SubconAssignedSiteOut] = Field(default_factory=list)
    transactions: list[SubconTransactionOut] = Field(default_factory=list)
