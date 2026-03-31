from __future__ import annotations

from typing import Optional
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class TransactionCreate(BaseModel):
    project_id: int
    site_id: Optional[int] = None
    recipient_type_id: Optional[int] = None
    recipient_id: Optional[int] = None
    type_id: int
    amount: Decimal
    remarks: Optional[str] = None
    recharge_validity: Optional[int] = None
    recharge_uom: Optional[str] = None


class StatusUpdate(BaseModel):
    status_id: int
    version: int
    execution_date: Optional[date] = None


class TransactionOut(BaseModel):
    id: int
    request_date: date
    recipient_type_id: Optional[int]
    recipient_id: Optional[int]
    type_id: int
    project_id: int
    site_id: Optional[int]
    amount: Decimal
    status_id: int
    execution_date: Optional[date]
    remarks: Optional[str]
    version: int
