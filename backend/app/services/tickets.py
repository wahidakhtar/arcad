from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ops import Ticket


def list_open_tickets(db: Session) -> list[Ticket]:
    return db.execute(select(Ticket).where(Ticket.closing_date.is_(None)).order_by(Ticket.ticket_date.desc())).scalars().all()


def create_ticket(db: Session, data: dict) -> Ticket:
    ticket = Ticket(**data)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def close_ticket(db: Session, ticket_id: int, data: dict) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    for key, value in data.items():
        setattr(ticket, key, value)
    db.commit()
    db.refresh(ticket)
    return ticket
