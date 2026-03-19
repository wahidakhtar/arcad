from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import UserContext
from app.models.acc import Transaction
from app.models.core import IndianState, Project
from app.models.hr import User
from app.models.hr import Role, UserRole
from app.models.ma import MASite
from app.models.mc import MCSite
from app.models.md import MDSite
from app.models.ops import Ticket
from app.models.ops import FEAssignment

STATEFUL_SITE_MODELS = {
    "md": MDSite,
    "ma": MASite,
    "mc": MCSite,
}


def _resolve_date_window(range_key: str, start_date: Optional[date], end_date: Optional[date]) -> tuple[Optional[date], Optional[date]]:
    today = date.today()
    if range_key == "7d":
        return today - timedelta(days=6), today
    if range_key == "30d":
        return today - timedelta(days=29), today
    if range_key == "custom":
        if start_date and end_date and start_date > end_date:
            return end_date, start_date
        return start_date, end_date
    return None, None


def _date_filters(column, start_date: Optional[date], end_date: Optional[date]) -> list:
    filters = []
    if start_date is not None:
        filters.append(column >= start_date)
    if end_date is not None:
        filters.append(column <= end_date)
    return filters


def _has_global_project_scope(user: UserContext) -> bool:
    return any(role.global_scope and role.dept_key in {"mgmt", "acc"} for role in user.roles)


def _scoped_project_ids(db: Session, user: UserContext) -> set[int]:
    if _has_global_project_scope(user):
        return {
            row.id
            for row in db.execute(select(Project).where(Project.active.is_(True), Project.recurring.is_(True))).scalars()
        }

    project_ids = {role.project_id for role in user.roles if role.project_id is not None}
    if user.is_fo:
        project_ids.update(
            db.execute(select(FEAssignment.project_id).where(FEAssignment.fe_id == user.user_id).distinct()).scalars().all()
        )
    return {project_id for project_id in project_ids if project_id is not None}


def _user_count(db: Session, user: UserContext, start_date: Optional[date], end_date: Optional[date]) -> int:
    stmt = select(func.count(func.distinct(User.id))).select_from(User)
    stmt = stmt.where(*_date_filters(User.created_at, start_date, end_date))

    visible_departments = {role.dept_key for role in user.roles}
    if "mgmt" in visible_departments or "hr" in visible_departments:
        return db.scalar(stmt) or 0

    stmt = stmt.join(UserRole, UserRole.user_id == User.id).join(Role, Role.id == UserRole.role_id).where(Role.dept_key.in_(visible_departments))
    return db.scalar(stmt) or 0


def _requested_transaction_count(db: Session, user: UserContext, start_date: Optional[date], end_date: Optional[date]) -> int:
    stmt = select(func.count(func.distinct(Transaction.id))).where(
        Transaction.status_id == 38,
        *_date_filters(Transaction.request_date, start_date, end_date),
    )
    if user.is_fo:
        stmt = stmt.join(
            FEAssignment,
            (FEAssignment.project_id == Transaction.project_id)
            & (FEAssignment.site_id == Transaction.site_id)
            & (FEAssignment.fe_id == user.user_id),
        )
        return db.scalar(stmt) or 0

    project_ids = _scoped_project_ids(db, user)
    if not project_ids:
        return 0
    return db.scalar(stmt.where(Transaction.project_id.in_(project_ids))) or 0


def _open_ticket_count(db: Session, user: UserContext, start_date: Optional[date], end_date: Optional[date]) -> int:
    stmt = select(func.count(func.distinct(Ticket.id))).where(
        Ticket.closing_date.is_(None),
        *_date_filters(Ticket.ticket_date, start_date, end_date),
    )
    if user.is_fo:
        stmt = stmt.join(
            FEAssignment,
            (FEAssignment.project_id == Ticket.project_id)
            & (FEAssignment.site_id == Ticket.site_id)
            & (FEAssignment.fe_id == user.user_id),
        )
        return db.scalar(stmt) or 0

    project_ids = _scoped_project_ids(db, user)
    if not project_ids:
        return 0
    return db.scalar(stmt.where(Ticket.project_id.in_(project_ids))) or 0


def summary(db: Session, user: UserContext, range_key: str, start_date: Optional[date], end_date: Optional[date]) -> dict[str, object]:
    resolved_start, resolved_end = _resolve_date_window(range_key, start_date, end_date)
    return {
        "users": _user_count(db, user, resolved_start, resolved_end),
        "requested_transactions": _requested_transaction_count(db, user, resolved_start, resolved_end),
        "open_tickets": _open_ticket_count(db, user, resolved_start, resolved_end),
        "range_key": range_key,
        "start_date": resolved_start,
        "end_date": resolved_end,
    }


def map_data(db: Session, user: UserContext, range_key: str, start_date: Optional[date], end_date: Optional[date]) -> list[dict]:
    resolved_start, resolved_end = _resolve_date_window(range_key, start_date, end_date)
    project_rows = db.execute(select(Project).where(Project.key.in_(tuple(STATEFUL_SITE_MODELS.keys())))).scalars().all()
    project_map = {row.key: row.id for row in project_rows}
    project_label_map = {row.key: row.label for row in project_rows}
    visible_project_ids = _scoped_project_ids(db, user)
    totals: dict[int, int] = {}
    project_totals: dict[int, dict[str, int]] = {}

    for project_key, model in STATEFUL_SITE_MODELS.items():
        project_id = project_map.get(project_key)
        if project_id is None:
            continue
        if not user.is_fo and project_id not in visible_project_ids:
            continue

        stmt = select(model.state_id, func.count()).where(
            model.state_id.is_not(None),
            *_date_filters(model.receiving_date, resolved_start, resolved_end),
        )
        if user.is_fo:
            stmt = stmt.join(
                FEAssignment,
                (FEAssignment.project_id == project_id)
                & (FEAssignment.site_id == model.id)
                & (FEAssignment.fe_id == user.user_id),
            )
        stmt = stmt.group_by(model.state_id)

        for state_id, count in db.execute(stmt).all():
            if state_id is None:
                continue
            totals[state_id] = totals.get(state_id, 0) + count
            project_totals.setdefault(state_id, {})[project_key] = count

    if not totals:
        return []

    states = {
        row.id: row.label
        for row in db.execute(select(IndianState).where(IndianState.id.in_(tuple(totals.keys())))).scalars()
    }
    return [
        {
            "state_id": state_id,
            "label": states.get(state_id, f"State {state_id}"),
            "count": count,
            "projects": [
                {
                    "project_key": project_key,
                    "project_label": project_label_map.get(project_key, project_key.upper()),
                    "count": project_count,
                }
                for project_key, project_count in sorted(project_totals.get(state_id, {}).items())
            ],
        }
        for state_id, count in sorted(totals.items(), key=lambda item: (-item[1], states.get(item[0], "")))
    ]
