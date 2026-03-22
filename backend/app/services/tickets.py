from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import UserContext, user_project_ids
from app.models.core import Project
from app.models.ops import Ticket
from app.services.common import badge_map, get_site_model


def _apply_ticket_site_rules(db: Session, ticket: Ticket, closing: bool) -> None:
    """Update site status as a side effect of ticket open/close."""
    from sqlalchemy import select

    project = db.get(Project, ticket.project_id)
    if project is None:
        return

    project_key = project.key
    try:
        site_model = get_site_model(project_key)
    except KeyError:
        return

    site = db.execute(select(site_model).where(site_model.id == ticket.site_id)).scalar_one_or_none()
    if site is None:
        return

    badges = badge_map(db)
    by_key = {b.key: b.id for b in badges.values()}

    if project_key == "bb":
        site.status_id = by_key.get("live" if closing else "down", site.status_id)
    else:
        if not closing:
            site.status_id = by_key.get("rect", site.status_id)
        else:
            if _comp_condition_met(site, project_key):
                site.status_id = by_key.get("comp", site.status_id)
                try:
                    from app.services import acc_rules
                    from app.services.common import get_project
                    proj = get_project(db, project_key)
                    acc_rules.maybe_create_site_invoice(db, project_key, proj.id, site.id, site.subproject_id)
                    acc_rules.maybe_create_subproject_invoice(db, project_key, proj.id, site.subproject_id)
                except Exception:
                    pass
            else:
                site.status_id = by_key.get("wip", site.status_id)

    if hasattr(site, "version"):
        site.version = (site.version or 0) + 1
    db.commit()


def _comp_condition_met(site, project_key: str) -> bool:
    """Check if site has met its completion condition."""
    if project_key == "mi":
        return getattr(site, "completion_date", None) is not None
    if project_key == "md":
        return getattr(site, "dismantle_date", None) is not None or getattr(site, "outcome", None) == "Asset Tx"
    if project_key == "ma":
        return getattr(site, "audit_date", None) is not None
    if project_key == "mc":
        return getattr(site, "cm_date", None) is not None
    return False


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
    _apply_ticket_site_rules(db, ticket, closing=False)
    return ticket


def close_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.closing_date = date.today()
    db.commit()
    db.refresh(ticket)
    _apply_ticket_site_rules(db, ticket, closing=True)
    return ticket
