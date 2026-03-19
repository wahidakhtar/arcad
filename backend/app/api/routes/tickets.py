from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.services import tickets as ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", dependencies=[Depends(permission_required("site", "read"))])
def list_tickets(db: Session = Depends(get_db)):
    return ticket_service.list_all_tickets(db)


@router.get("/{ticket_id}", dependencies=[Depends(permission_required("site", "read"))])
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return ticket_service.get_ticket(db, ticket_id)


@router.post("", dependencies=[Depends(permission_required("site", "write"))])
def create_ticket(payload: dict, db: Session = Depends(get_db)):
    return ticket_service.create_ticket(db, payload)


@router.patch("/{ticket_id}/close", dependencies=[Depends(permission_required("site", "write"))])
def close_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return ticket_service.close_ticket(db, ticket_id)
