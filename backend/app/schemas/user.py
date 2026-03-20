from __future__ import annotations

from typing import Optional
from pydantic import BaseModel

from app.schemas.auth import RoleEntry


class UserCreate(BaseModel):
    label: str
    username: str
    password: str
    department: Optional[str] = None
    aadhaar: Optional[str] = None
    upi: Optional[str] = None
    ctc: Optional[str] = None
    active: bool = True


class PasswordResetRequest(BaseModel):
    password: str


class UserUpdate(BaseModel):
    label: Optional[str] = None
    username: Optional[str] = None
    aadhaar: Optional[str] = None
    upi: Optional[str] = None
    ctc: Optional[str] = None
    active: Optional[bool] = None


class UserRoleAssignment(BaseModel):
    dept_key: str
    level_key: str
    project_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    username: str
    label: str
    aadhaar: Optional[str]
    upi: Optional[str]
    ctc: Optional[str]
    active: bool
    roles: list[RoleEntry]
