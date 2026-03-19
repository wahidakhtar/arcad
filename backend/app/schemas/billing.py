from __future__ import annotations

from typing import Optional
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class POCreate(BaseModel):
    project_id: int
    site_id: Optional[int] = None
    entity_id: Optional[str] = None
    po_no: Optional[str] = None
    po_date: Optional[date] = None
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    po_status_id: int


class POOut(BaseModel):
    id: int
    project_id: int
    site_id: Optional[int]
    entity_id: Optional[str]
    po_no: Optional[str]
    po_date: Optional[date]
    po_status_id: int


class InvoiceCreate(BaseModel):
    po_id: int
    invoice_no: Optional[str] = None
    submission_date: Optional[date] = None
    settlement_date: Optional[date] = None
    invoice_status_id: int


class InvoiceOut(BaseModel):
    id: int
    po_id: int
    invoice_no: Optional[str]
    submission_date: Optional[date]
    settlement_date: Optional[date]
    invoice_status_id: int


class StatusUpdate(BaseModel):
    status_id: int


class RateCardCreate(BaseModel):
    job_id: int
    date: date
    cost: Decimal
