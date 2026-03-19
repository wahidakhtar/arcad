from __future__ import annotations

from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

ItemT = TypeVar("ItemT")


class BadgeOut(BaseModel):
    id: int
    type: str
    key: str
    label: str
    color: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


class PaginatedResponse(BaseModel, Generic[ItemT]):
    items: list[ItemT]
    total: int
    page: int
    page_size: int
