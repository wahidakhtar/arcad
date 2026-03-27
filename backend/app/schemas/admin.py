from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class BadgeUpdate(BaseModel):
    label: str
    color: Optional[str] = None


class BadgeTransitionCreate(BaseModel):
    project: str  # "mi", "md", "ma", "mc"
    type_id: int
    from_id: int
    to_id: int


class UIFieldUpdate(BaseModel):
    label: Optional[str] = None
    list_view: Optional[bool] = None
    form_view: Optional[bool] = None
    bulk_view: Optional[bool] = None
    tag: Optional[str] = None


class UIFieldReorder(BaseModel):
    # list of field ids in desired order
    ids: list[int]


class JobUpdate(BaseModel):
    label: Optional[str] = None
    scale_by: Optional[str] = None


class RoleTagUpdate(BaseModel):
    role_id: int
    tag_id: int
    read: bool
    write: bool
