from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, permission_required
from app.core.database import get_db
from app.services import tickets as ticket_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("")
def list_tickets(user: UserContext = Depends(permission_required("ticket", "read")), db: Session = Depends(get_db)):
    return ticket_service.list_all_tickets(db, user)


@router.get("/{ticket_id}", dependencies=[Depends(permission_required("ticket", "read"))])
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return ticket_service.get_ticket(db, ticket_id)


@router.post("", dependencies=[Depends(permission_required("ticket", "write"))])
def create_ticket(payload: dict, db: Session = Depends(get_db)):
    return ticket_service.create_ticket(db, payload)


@router.patch("/{ticket_id}/close", dependencies=[Depends(permission_required("ticket", "write"))])
def close_ticket(ticket_id: int, db: Session = Depends(get_db)):
    return ticket_service.close_ticket(db, ticket_id)
