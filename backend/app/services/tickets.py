from __future__ import annotations

import logging
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import UserContext, user_project_ids
from app.models.core import Project
from app.models.ops import Ticket
from app.services.common import badge_map, get_site_model

logger = logging.getLogger("arcad.tickets")


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
        if hasattr(site, "active"):
            site.active = True
    else:
        if not closing:
            site.status_id = by_key.get("rect", site.status_id)
            if hasattr(site, "active"):
                site.active = True
        else:
            if _comp_condition_met(site, project_key):
                site.status_id = by_key.get("comp", site.status_id)
                if hasattr(site, "active"):
                    site.active = False
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
                if hasattr(site, "active"):
                    site.active = True

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


def list_all_tickets(db: Session, user: UserContext, page: int = 1, page_size: int = 50) -> dict:
    query = select(Ticket).order_by(Ticket.ticket_date.desc())

    project_ids = user_project_ids(user)
    if project_ids is not None:
        query = query.where(Ticket.project_id.in_(project_ids))

    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar_one()
    page_size = max(1, page_size)
    pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, pages))
    offset = (page - 1) * page_size
    items = db.execute(query.limit(page_size).offset(offset)).scalars().all()
    return {"items": list(items), "total": total, "page": page, "page_size": page_size, "pages": pages}


def get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def create_ticket(db: Session, data: dict) -> Ticket:
    if not data.get("project_id") or not data.get("site_id") or not data.get("ticket_date"):
        raise HTTPException(status_code=400, detail="project_id, site_id, and ticket_date are required")
    ticket = Ticket(**data)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    try:
        _apply_ticket_site_rules(db, ticket, closing=False)
    except Exception:
        logger.exception("ticket_site_rules failed for ticket_id=%s", ticket.id)
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
