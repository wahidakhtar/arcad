from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import UserContext, user_project_ids
from app.models.ops import Ticket


def list_all_tickets(db: Session, user: UserContext) -> list[Ticket]:
    query = select(Ticket).order_by(Ticket.ticket_date.desc())

    project_ids = user_project_ids(user)
    if project_ids is not None:
        # Ops and other project-scoped roles: filter by assigned projects
        query = query.where(Ticket.project_id.in_(project_ids))
    # Global-scope users (mgmt, acc): no filter — see all
    # FO cannot reach this function (blocked by ticket permission check in route)

    return db.execute(query).scalars().all()


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def create_ticket(db: Session, data: dict) -> Ticket:
    ticket = Ticket(**data)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def close_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.closing_date = date.today()
    db.commit()
    db.refresh(ticket)
    return ticket
