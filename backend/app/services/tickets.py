from __future__ import annotations

import logging
import re
from datetime import date, datetime, time
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import UserContext, user_project_ids
from app.models.core import Project
from app.models.md import MDOutcome
from app.models.ops import PunchPoint, Ticket, TicketPunchPoint
from app.services.common import badge_map, get_site_model

logger = logging.getLogger("arcad.tickets")


def _parse_date(value: Any, label: str) -> date:
    if isinstance(value, date):
        parsed = value
    else:
        text_value = str(value or "").strip()
        if not text_value:
            raise HTTPException(status_code=400, detail=f"{label} is required.")
        try:
            parsed = datetime.strptime(text_value, "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc
    if parsed > date.today():
        raise HTTPException(status_code=400, detail=f"{label} cannot be later than today.")
    return parsed


def _parse_time(value: Any, label: str) -> time | None:
    text_value = str(value or "").strip()
    if not text_value:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(text_value, fmt).time().replace(second=0, microsecond=0)
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid {label}.")


def _selected_punch_points(db: Session, project_id: int, punch_point_ids: list[int]) -> list[PunchPoint]:
    unique_ids = list(dict.fromkeys(punch_point_ids))
    if not unique_ids:
        return []
    rows = db.execute(
        select(PunchPoint).where(PunchPoint.project_id == project_id, PunchPoint.id.in_(unique_ids)).order_by(PunchPoint.id)
    ).scalars().all()
    if len(rows) != len(unique_ids):
        raise HTTPException(status_code=400, detail="Invalid punch point selection.")
    by_id = {row.id: row for row in rows}
    return [by_id[row_id] for row_id in unique_ids]


def _replace_ticket_punch_points(db: Session, ticket_id: int, punch_points: list[PunchPoint]) -> None:
    db.query(TicketPunchPoint).filter(TicketPunchPoint.ticket_id == ticket_id).delete()
    for punch_point in punch_points:
        db.add(TicketPunchPoint(ticket_id=ticket_id, punch_point_id=punch_point.id))


def _ticket_punch_points(db: Session, ticket_ids: list[int]) -> dict[int, list[dict[str, Any]]]:
    if not ticket_ids:
        return {}
    rows = db.execute(
        select(TicketPunchPoint.ticket_id, PunchPoint.id, PunchPoint.label)
        .join(PunchPoint, PunchPoint.id == TicketPunchPoint.punch_point_id)
        .where(TicketPunchPoint.ticket_id.in_(ticket_ids))
        .order_by(TicketPunchPoint.ticket_id, PunchPoint.label, PunchPoint.id)
    ).all()
    result: dict[int, list[dict[str, Any]]] = {}
    for ticket_id, punch_point_id, label in rows:
        result.setdefault(ticket_id, []).append({"id": punch_point_id, "label": label})
    return result


def _serialize_ticket(ticket: Ticket, punch_points: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "project_id": ticket.project_id,
        "site_id": ticket.site_id,
        "ticket_date": ticket.ticket_date.isoformat() if ticket.ticket_date else None,
        "ticket_time": ticket.ticket_time.strftime("%H:%M") if ticket.ticket_time else None,
        "pp_id": ticket.pp_id,
        "closing_date": ticket.closing_date.isoformat() if ticket.closing_date else None,
        "closing_time": ticket.closing_time.strftime("%H:%M") if ticket.closing_time else None,
        "punch_points": punch_points,
    }


def _project_and_site(db: Session, project_id: int, site_id: int) -> tuple[Project, Any]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        site_model = get_site_model(project.key)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail="Unsupported project for tickets.") from exc
    site = db.execute(select(site_model).where(site_model.id == site_id)).scalar_one_or_none()
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return project, site


def _ensure_ticket_allowed(project: Project, site: Any, *, closing: bool) -> None:
    if closing:
        return
    status_key = getattr(site, "status_key", None)
    if project.key == "bb":
        if status_key != "live":
            raise HTTPException(status_code=400, detail="Tickets can only be added for live BB sites.")
    elif status_key != "comp":
        raise HTTPException(status_code=400, detail="Tickets can only be added for completed sites.")


def _ticket_number(site: Any, ticket_date: date, ticket_time: time | None) -> str:
    stamp_time = ticket_time or datetime.now().time().replace(second=0, microsecond=0)
    ckt_id = re.sub(r"[^A-Za-z0-9]+", "", str(getattr(site, "ckt_id", "") or "")).upper()
    if not ckt_id:
        ckt_id = str(getattr(site, "id", "SITE"))
    return f"{ticket_date.strftime('%y%m%d')}{stamp_time.strftime('%H%M')}{ckt_id}"


def _apply_ticket_site_rules(db: Session, ticket: Ticket, closing: bool) -> None:
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
        if getattr(site, "status_key", None) == "down":
            site.status_id = by_key.get("live", site.status_id)
        if hasattr(site, "active"):
            site.active = True
    else:
        if not closing:
            site.status_id = by_key.get("rect", site.status_id)
            if hasattr(site, "active"):
                site.active = True
        else:
            if _comp_condition_met(db, site, project_key):
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


def _comp_condition_met(db: Session, site: Any, project_key: str) -> bool:
    if project_key == "mi":
        return getattr(site, "completion_date", None) is not None
    if project_key == "md":
        outcome_id = getattr(site, "outcome_id", None)
        if outcome_id is None:
            return getattr(site, "dismantle_date", None) is not None
        outcome = db.get(MDOutcome, int(outcome_id))
        return getattr(site, "dismantle_date", None) is not None or (outcome is not None and outcome.label == "Asset Tx")
    if project_key == "ma":
        return getattr(site, "audit_date", None) is not None
    if project_key == "mc":
        return getattr(site, "cm_date", None) is not None
    return False


def list_all_tickets(db: Session, user: UserContext, page: int = 1, page_size: int = 50) -> dict:
    query = select(Ticket).order_by(Ticket.ticket_date.desc(), Ticket.ticket_time.desc().nullslast(), Ticket.id.desc())

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
    tickets = db.execute(query.limit(page_size).offset(offset)).scalars().all()
    punch_points = _ticket_punch_points(db, [ticket.id for ticket in tickets])
    items = [_serialize_ticket(ticket, punch_points.get(ticket.id, [])) for ticket in tickets]
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def get_ticket(db: Session, ticket_id: int) -> dict[str, Any]:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    punch_points = _ticket_punch_points(db, [ticket.id])
    return _serialize_ticket(ticket, punch_points.get(ticket.id, []))


def create_ticket(db: Session, data: dict) -> dict[str, Any]:
    if not data.get("project_id") or not data.get("site_id") or not data.get("ticket_date"):
        raise HTTPException(status_code=400, detail="project_id, site_id, and ticket_date are required")

    project_id = int(data["project_id"])
    site_id = int(data["site_id"])
    ticket_date = _parse_date(data.get("ticket_date"), "Ticket Date")
    project, site = _project_and_site(db, project_id, site_id)
    _ensure_ticket_allowed(project, site, closing=False)

    open_ticket = db.execute(
        select(Ticket).where(Ticket.project_id == project_id, Ticket.site_id == site_id, Ticket.closing_date.is_(None))
    ).scalar_one_or_none()
    if open_ticket is not None:
        raise HTTPException(status_code=400, detail="Only one open ticket is allowed per site.")

    ticket_time = _parse_time(data.get("ticket_time"), "Ticket Time")
    if project.key == "bb" and ticket_time is None:
        raise HTTPException(status_code=400, detail="Ticket Time is required for BB tickets.")

    punch_points = _selected_punch_points(db, project_id, [int(value) for value in (data.get("punch_point_ids") or [])])

    ticket = Ticket(
        project_id=project_id,
        site_id=site_id,
        ticket_date=ticket_date,
        ticket_time=ticket_time,
        ticket_number=_ticket_number(site, ticket_date, ticket_time),
        pp_id=punch_points[0].id if punch_points else None,
    )
    db.add(ticket)
    db.flush()
    _replace_ticket_punch_points(db, ticket.id, punch_points)
    db.commit()
    db.refresh(ticket)
    try:
        _apply_ticket_site_rules(db, ticket, closing=False)
    except Exception:
        logger.exception("ticket_site_rules failed for ticket_id=%s", ticket.id)
    return _serialize_ticket(ticket, [{"id": row.id, "label": row.label} for row in punch_points])


def update_ticket(db: Session, ticket_id: int, data: dict) -> dict[str, Any]:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.closing_date is not None:
        raise HTTPException(status_code=400, detail="Closed tickets cannot be updated.")
    if "punch_point_ids" in data:
        punch_points = _selected_punch_points(db, ticket.project_id, [int(value) for value in (data.get("punch_point_ids") or [])])
        _replace_ticket_punch_points(db, ticket.id, punch_points)
        ticket.pp_id = punch_points[0].id if punch_points else None
    db.commit()
    db.refresh(ticket)
    punch_points = _ticket_punch_points(db, [ticket.id])
    return _serialize_ticket(ticket, punch_points.get(ticket.id, []))


def close_ticket(db: Session, ticket_id: int, data: dict | None = None) -> dict[str, Any]:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.closing_date is not None:
        raise HTTPException(status_code=400, detail="Ticket is already closed.")

    data = data or {}
    project, _site = _project_and_site(db, ticket.project_id, ticket.site_id)
    if "punch_point_ids" in data:
        punch_points = _selected_punch_points(db, ticket.project_id, [int(value) for value in (data.get("punch_point_ids") or [])])
        _replace_ticket_punch_points(db, ticket.id, punch_points)
        ticket.pp_id = punch_points[0].id if punch_points else None

    existing_points = _ticket_punch_points(db, [ticket.id]).get(ticket.id, [])
    if not existing_points:
        raise HTTPException(status_code=400, detail="At least one Punch Point is required before closing the ticket.")

    ticket.closing_date = _parse_date(data.get("closing_date"), "Closing Date")
    if project.key == "bb":
        closing_time = _parse_time(data.get("closing_time"), "Closing Time")
        if closing_time is None:
            raise HTTPException(status_code=400, detail="Closing Time is required for BB tickets.")
        ticket.closing_time = closing_time
    db.commit()
    db.refresh(ticket)
    _apply_ticket_site_rules(db, ticket, closing=True)
    punch_points = _ticket_punch_points(db, [ticket.id])
    return _serialize_ticket(ticket, punch_points.get(ticket.id, []))
