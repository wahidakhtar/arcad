from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db

router = APIRouter(prefix="/error-log", tags=["error-log"])


class ErrorLogCreate(BaseModel):
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    http_status: Optional[int] = None
    http_url: Optional[str] = None
    page_url: str = ""
    extra: Optional[dict] = None


@router.post("", status_code=201)
def create_error_log(
    payload: ErrorLogCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    user_id: Optional[int] = None
    username: Optional[str] = None

    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_token
            from app.models.hr import User

            token_payload = decode_token(auth_header[7:])
            uid = int(token_payload.get("sub", 0))
            user = db.get(User, uid)
            if user and user.active:
                user_id = user.id
                username = user.username
        except Exception:
            pass

    row_id = db.execute(
        text("""
            INSERT INTO schema_core.frontend_error_logs
              (user_id, username, page_url, error_type, error_message,
               stack_trace, http_status, http_url, user_agent, extra)
            VALUES
              (:user_id, :username, :page_url, :error_type, :error_message,
               :stack_trace, :http_status, :http_url, :user_agent,
               cast(:extra as jsonb))
            RETURNING id
        """),
        {
            "user_id": user_id,
            "username": username,
            "page_url": payload.page_url,
            "error_type": payload.error_type,
            "error_message": payload.error_message,
            "stack_trace": payload.stack_trace,
            "http_status": payload.http_status,
            "http_url": payload.http_url,
            "user_agent": request.headers.get("user-agent", ""),
            "extra": json.dumps(payload.extra) if payload.extra else None,
        },
    ).scalar_one()
    db.commit()
    return {"id": row_id}


@router.get("", dependencies=[Depends(permission_required("admin", "read"))])
def list_error_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    error_type: Optional[str] = Query(default=None),
    user_id: Optional[int] = Query(default=None),
    since: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    conditions = ["1=1"]
    params: dict = {"limit": limit, "offset": offset}

    if error_type:
        conditions.append("error_type = :error_type")
        params["error_type"] = error_type
    if user_id is not None:
        conditions.append("user_id = :user_id")
        params["user_id"] = user_id
    if since:
        conditions.append("created_at >= cast(:since as timestamptz)")
        params["since"] = since

    where = " AND ".join(conditions)

    total = db.execute(
        text(f"SELECT COUNT(*) FROM schema_core.frontend_error_logs WHERE {where}"),
        params,
    ).scalar_one()

    rows = db.execute(
        text(f"""
            SELECT id, created_at, user_id, username, page_url, error_type,
                   error_message, stack_trace, http_status, http_url, user_agent, extra
            FROM schema_core.frontend_error_logs
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()

    items = []
    for row in rows:
        item = dict(row)
        if item.get("created_at"):
            item["created_at"] = item["created_at"].isoformat()
        items.append(item)

    return {"total": total, "limit": limit, "offset": offset, "items": items}
