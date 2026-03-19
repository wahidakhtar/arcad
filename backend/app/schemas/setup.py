from __future__ import annotations

from pydantic import BaseModel


class CreateCEORequest(BaseModel):
    label: str
    username: str
    password: str
