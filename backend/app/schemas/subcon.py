from __future__ import annotations

from datetime import datetime

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
