from __future__ import annotations

from typing import Optional
from datetime import datetime

from pydantic import BaseModel


class RoleEntry(BaseModel):
    id: int
    key: str
    label: str
    dept_key: str
    level_key: str
    project_id: Optional[int]


class LoginRequest(BaseModel):
    username: str
    password: str
    device_label: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class JWTPayload(BaseModel):
    sub: str
    exp: datetime
    sid: Optional[str] = None
    type: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: datetime
    refresh_expires_at: datetime
    user_id: int
    username: str
    label: str
    roles: list[RoleEntry]
