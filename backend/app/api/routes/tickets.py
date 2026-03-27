from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import UserContext, permission_required
from app.core.database import get_db
from app.core.ws_manager import manager as ws_manager
from app.services import tickets as ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("")
def list_tickets(
    user: UserContext = Depends(permission_required("ticket", "read")),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
):
    return ticket_service.list_all_tickets(db, user, page=page, page_size=page_size)


@router.get("/{ticket_id}", dependencies=[Depends(permission_required("ticket", "read"))])
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return ticket_service.get_ticket(db, ticket_id)


@router.post("", dependencies=[Depends(permission_required("ticket", "write"))])
async def create_ticket(payload: dict, db: Session = Depends(get_db)):
    result = ticket_service.create_ticket(db, payload)
    await ws_manager.broadcast({"type": "TICKET_CREATED", "ticket_id": result.get("id") if isinstance(result, dict) else getattr(result, "id", None)})
    return result


@router.patch("/{ticket_id}/close", dependencies=[Depends(permission_required("ticket", "write"))])
async def close_ticket(ticket_id: int, db: Session = Depends(get_db)):
    result = ticket_service.close_ticket(db, ticket_id)
    site_id = result.get("site_id") if isinstance(result, dict) else getattr(result, "site_id", None)
    await ws_manager.broadcast({"type": "TICKET_CLOSED", "ticket_id": ticket_id, "site_id": site_id})
    return result
