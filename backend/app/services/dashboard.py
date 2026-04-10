from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import UserContext
from app.models.acc import Invoice, PO, Transaction
from app.models.bb import BBSite, Recharge, Termination
from app.models.core import Badge, IndianState, Project
from app.models.hr import User
from app.models.ma import MASite
from app.models.mc import MCSite
from app.models.md import MDOutcome, MDSite
from app.models.mi import MISite
from app.models.ops import Ticket

_MAP_PROJECT_KEYS = frozenset({"ma", "mc", "md"})

_SITE_MODELS = {
    "mi": MISite,
    "ma": MASite,
    "mc": MCSite,
    "md": MDSite,
    "bb": BBSite,
}

# Field used to determine "completed in period" per project
_COMPLETION_FIELD = {
    "mi": "completion_date",
    "ma": "audit_date",
    "mc": "cm_date",
    "md": "dismantle_date",
}

_WCC_PROJECTS = frozenset({"mi", "ma", "mc", "md"})
_REPORT_PROJECTS = frozenset({"ma", "mc"})


# ─── Utilities ────────────────────────────────────────────────────────────────

def _resolve_date_window(
    range_key: str,
    start_date: Optional[date],
    end_date: Optional[date],
) -> tuple[Optional[date], Optional[date]]:
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
    if start_date:
        filters.append(column >= start_date)
    if end_date:
        filters.append(column <= end_date)
    return filters


def _load_projects(db: Session) -> dict[str, int]:
    rows = db.execute(select(Project).where(Project.active.is_(True))).scalars().all()
    return {row.key: row.id for row in rows}


def _load_badges(db: Session, keys: list[str]) -> dict[str, int]:
    rows = db.execute(select(Badge).where(Badge.key.in_(keys))).scalars().all()
    return {row.key: row.id for row in rows}


def _dept_keys(user: UserContext) -> set[str]:
    return {r.dept_key for r in user.roles}


def _level_keys(user: UserContext) -> set[str]:
    return {r.level_key for r in user.roles}


def _accessible_project_ids(db: Session, user: UserContext) -> set[int]:
    if any(r.global_scope for r in user.roles):
        return {row.id for row in db.execute(select(Project).where(Project.active.is_(True))).scalars()}
    return {r.project_id for r in user.roles if r.project_id is not None}


def _include_staged(user: UserContext) -> bool:
    depts = _dept_keys(user)
    if "mgmt" in depts:
        return True
    if "ops" in depts:
        return "l3" in _level_keys(user)
    return False


def _md_outcome_id(db: Session, label: str) -> Optional[int]:
    row = db.execute(select(MDOutcome).where(MDOutcome.label == label)).scalar_one_or_none()
    return row.id if row else None


# ─── Pinned metrics ───────────────────────────────────────────────────────────

def _pending_pos(db: Session, project_ids: set[int], badges: dict[str, int]) -> int:
    pend_id = badges.get("pend")
    if not pend_id or not project_ids:
        return 0
    return db.scalar(
        select(func.count(PO.id)).where(
            PO.project_id.in_(project_ids),
            PO.po_status_id == pend_id,
        )
    ) or 0


def _pending_invoices(db: Session, project_ids: set[int], badges: dict[str, int]) -> int:
    pend_id = badges.get("pend")
    if not pend_id or not project_ids:
        return 0
    return db.scalar(
        select(func.count(Invoice.id))
        .join(PO, PO.id == Invoice.po_id)
        .where(
            PO.project_id.in_(project_ids),
            Invoice.invoice_status_id == pend_id,
        )
    ) or 0


def _pending_transactions(db: Session, project_ids: set[int], badges: dict[str, int]) -> int:
    req_id = badges.get("req")
    if not req_id or not project_ids:
        return 0
    return db.scalar(
        select(func.count(Transaction.id)).where(
            Transaction.project_id.in_(project_ids),
            Transaction.status_id == req_id,
        )
    ) or 0


def _open_tickets(db: Session, project_ids: set[int]) -> int:
    if not project_ids:
        return 0
    return db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.project_id.in_(project_ids),
            Ticket.closing_date.is_(None),
        )
    ) or 0


def _pending_wcc(db: Session, project_key: str, badges: dict[str, int]) -> int:
    """Pending WCC count for a single project (MA/MC/MI/MD-Dismantle)."""
    pend_id = badges.get("pend")
    if not pend_id or project_key not in _WCC_PROJECTS:
        return 0
    model = _SITE_MODELS[project_key]
    if project_key == "md":
        dismantle_id = _md_outcome_id(db, "Dismantle")
        if not dismantle_id:
            return 0
        return db.scalar(
            select(func.count(model.id)).where(
                model.active.is_(True),
                model.wcc_status_id == pend_id,
                model.outcome_id == dismantle_id,
                model.dismantle_date.isnot(None),
            )
        ) or 0
    return db.scalar(
        select(func.count(model.id)).where(
            model.active.is_(True),
            model.wcc_status_id == pend_id,
        )
    ) or 0


def _pending_tx_copy(db: Session, badges: dict[str, int]) -> int:
    """Pending Tx Copy count (MD Asset Tx outcome only)."""
    pend_id = badges.get("pend")
    if not pend_id:
        return 0
    asset_tx_id = _md_outcome_id(db, "Asset Tx")
    if not asset_tx_id:
        return 0
    return db.scalar(
        select(func.count(MDSite.id)).where(
            MDSite.active.is_(True),
            MDSite.wcc_status_id == pend_id,
            MDSite.outcome_id == asset_tx_id,
        )
    ) or 0


def _pending_reports(db: Session, project_key: str, badges: dict[str, int]) -> int:
    pend_id = badges.get("pend")
    if not pend_id or project_key not in _REPORT_PROJECTS:
        return 0
    model = _SITE_MODELS[project_key]
    return db.scalar(
        select(func.count(model.id)).where(
            model.active.is_(True),
            model.report_status_id == pend_id,
        )
    ) or 0


def _bb_active_sites(db: Session) -> int:
    return db.scalar(select(func.count(BBSite.id)).where(BBSite.active.is_(True))) or 0


def _bb_down_sites(db: Session, badges: dict[str, int]) -> int:
    down_id = badges.get("down")
    if not down_id:
        return 0
    return db.scalar(
        select(func.count(BBSite.id)).where(
            BBSite.active.is_(True),
            BBSite.status_id == down_id,
        )
    ) or 0


def _bb_expired_recharges(db: Session) -> int:
    today = date.today()
    latest_subq = (
        select(Recharge.site_id, func.max(Recharge.id).label("latest_id"))
        .group_by(Recharge.site_id)
        .subquery()
    )
    return db.scalar(
        select(func.count())
        .select_from(latest_subq)
        .join(Recharge, Recharge.id == latest_subq.c.latest_id)
        .join(BBSite, BBSite.id == latest_subq.c.site_id)
        .where(BBSite.active.is_(True), Recharge.next_recharge_date < today)
    ) or 0


# ─── Period metrics ───────────────────────────────────────────────────────────

def _sites_received(
    db: Session, project_key: str, start_date: Optional[date], end_date: Optional[date]
) -> int:
    model = _SITE_MODELS.get(project_key)
    if model is None:
        return 0
    return db.scalar(
        select(func.count(model.id)).where(
            model.active.is_(True),
            *_date_filters(model.receiving_date, start_date, end_date),
        )
    ) or 0


def _sites_in_progress(db: Session, project_key: str, badges: dict[str, int]) -> int:
    """Snapshot count of sites in an active (non-terminal) state."""
    model = _SITE_MODELS.get(project_key)
    if model is None:
        return 0
    closed_ids = [badges[k] for k in ("comp", "cancel", "term", "stage") if k in badges]
    if not closed_ids:
        return 0
    return db.scalar(
        select(func.count(model.id)).where(
            model.active.is_(True),
            model.status_id.notin_(closed_ids),
        )
    ) or 0


def _sites_completed(
    db: Session, project_key: str, start_date: Optional[date], end_date: Optional[date]
) -> int:
    model = _SITE_MODELS.get(project_key)
    field_name = _COMPLETION_FIELD.get(project_key)
    if model is None or field_name is None:
        return 0
    col = getattr(model, field_name, None)
    if col is None:
        return 0
    return db.scalar(
        select(func.count(model.id)).where(
            model.active.is_(True),
            *_date_filters(col, start_date, end_date),
        )
    ) or 0


def _bb_new_sites(
    db: Session, start_date: Optional[date], end_date: Optional[date]
) -> int:
    return db.scalar(
        select(func.count(BBSite.id)).where(
            *_date_filters(BBSite.receiving_date, start_date, end_date),
        )
    ) or 0


def _bb_terminated_sites(
    db: Session, start_date: Optional[date], end_date: Optional[date]
) -> int:
    return db.scalar(
        select(func.count(Termination.site_id)).where(
            *_date_filters(Termination.date, start_date, end_date),
        )
    ) or 0


def _new_users(db: Session, start_date: Optional[date], end_date: Optional[date]) -> int:
    return db.scalar(
        select(func.count(User.id)).where(
            *_date_filters(User.created_at, start_date, end_date),
        )
    ) or 0


# ─── Aggregation helpers ──────────────────────────────────────────────────────

def _aggregate_wcc_and_tx_copy(
    db: Session,
    project_map: dict[str, int],
    scoped_ids: set[int],
    badges: dict[str, int],
    include_tx_copy: bool = True,
) -> tuple[int, int]:
    wcc_total = 0
    tx_copy_total = 0
    for key, pid in project_map.items():
        if pid not in scoped_ids or key not in _WCC_PROJECTS:
            continue
        wcc_total += _pending_wcc(db, key, badges)
    if include_tx_copy and project_map.get("md") in scoped_ids:
        tx_copy_total = _pending_tx_copy(db, badges)
    return wcc_total, tx_copy_total


def _aggregate_reports(
    db: Session,
    project_map: dict[str, int],
    scoped_ids: set[int],
    badges: dict[str, int],
) -> int:
    return sum(
        _pending_reports(db, key, badges)
        for key, pid in project_map.items()
        if pid in scoped_ids and key in _REPORT_PROJECTS
    )


def _aggregate_site_periods(
    db: Session,
    project_map: dict[str, int],
    scoped_ids: set[int],
    badges: dict[str, int],
    start_date: Optional[date],
    end_date: Optional[date],
    exclude_keys: frozenset[str] = frozenset({"bb"}),
) -> dict:
    received = in_progress = completed = 0
    for key, pid in project_map.items():
        if pid not in scoped_ids or key in exclude_keys:
            continue
        received += _sites_received(db, key, start_date, end_date)
        in_progress += _sites_in_progress(db, key, badges)
        completed += _sites_completed(db, key, start_date, end_date)
    return {
        "sites_received": received,
        "sites_in_progress": in_progress,
        "sites_completed": completed,
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def summary(
    db: Session,
    user: UserContext,
    project_key: Optional[str],
    range_key: str,
    start_date: Optional[date],
    end_date: Optional[date],
) -> dict:
    resolved_start, resolved_end = _resolve_date_window(range_key, start_date, end_date)
    project_map = _load_projects(db)
    badges = _load_badges(db, ["pend", "req", "comp", "cancel", "term", "stage", "down"])
    accessible_ids = _accessible_project_ids(db, user)
    depts = _dept_keys(user)

    # Resolve project scope from tab selection
    if project_key:
        pid = project_map.get(project_key)
        scoped_ids = {pid} if pid and pid in accessible_ids else set()
    else:
        scoped_ids = accessible_ids

    pinned: dict[str, int] = {}
    period: dict = {}

    # ── mgmt ──────────────────────────────────────────────────────────────────
    if "mgmt" in depts:
        pinned["pending_pos"] = _pending_pos(db, scoped_ids, badges)
        pinned["pending_invoices"] = _pending_invoices(db, scoped_ids, badges)
        pinned["pending_transactions"] = _pending_transactions(db, scoped_ids, badges)
        pinned["open_tickets"] = _open_tickets(db, scoped_ids)

        wcc, tx_copy = _aggregate_wcc_and_tx_copy(db, project_map, scoped_ids, badges)
        if wcc:
            pinned["pending_wcc"] = wcc
        if tx_copy:
            pinned["pending_tx_copy"] = tx_copy

        reports = _aggregate_reports(db, project_map, scoped_ids, badges)
        if reports:
            pinned["pending_reports"] = reports

        period.update(_aggregate_site_periods(db, project_map, scoped_ids, badges, resolved_start, resolved_end))
        period["new_users"] = _new_users(db, resolved_start, resolved_end)

    # ── acc ───────────────────────────────────────────────────────────────────
    elif "acc" in depts:
        pinned["pending_pos"] = _pending_pos(db, scoped_ids, badges)
        pinned["pending_invoices"] = _pending_invoices(db, scoped_ids, badges)
        pinned["pending_transactions"] = _pending_transactions(db, scoped_ids, badges)

        period.update(_aggregate_site_periods(db, project_map, scoped_ids, badges, resolved_start, resolved_end))
        # acc only needs completed count, not received/in_progress
        period = {"sites_completed": period.get("sites_completed", 0)}

    # ── ops ───────────────────────────────────────────────────────────────────
    elif "ops" in depts:
        bb_pid = project_map.get("bb")
        non_bb_ids = scoped_ids - ({bb_pid} if bb_pid else set())

        if project_key == "bb":
            # BB tab selected — show BB-only metrics
            pinned["active_sites"] = _bb_active_sites(db)
            pinned["down_sites"] = _bb_down_sites(db, badges)
            pinned["expired_recharges"] = _bb_expired_recharges(db)
            pinned["open_tickets"] = _open_tickets(db, scoped_ids)
            period["new_sites"] = _bb_new_sites(db, resolved_start, resolved_end)
            period["terminated_sites"] = _bb_terminated_sites(db, resolved_start, resolved_end)

        elif non_bb_ids:
            # Non-BB ops project(s) in scope
            pinned["open_tickets"] = _open_tickets(db, non_bb_ids)

            for key, pid in project_map.items():
                if pid not in non_bb_ids:
                    continue
                if key in _WCC_PROJECTS:
                    pinned["pending_wcc"] = pinned.get("pending_wcc", 0) + _pending_wcc(db, key, badges)
                if key == "md" and pid in non_bb_ids:
                    tx = _pending_tx_copy(db, badges)
                    if tx:
                        pinned["pending_tx_copy"] = tx
                if key in _REPORT_PROJECTS:
                    pinned["pending_reports"] = pinned.get("pending_reports", 0) + _pending_reports(db, key, badges)

            period.update(_aggregate_site_periods(db, project_map, non_bb_ids, badges, resolved_start, resolved_end))

        else:
            # Only BB in scope (no project_key selected, all-tab, BB-only ops user)
            pinned["active_sites"] = _bb_active_sites(db)
            pinned["down_sites"] = _bb_down_sites(db, badges)
            pinned["expired_recharges"] = _bb_expired_recharges(db)
            pinned["open_tickets"] = _open_tickets(db, scoped_ids)
            period["new_sites"] = _bb_new_sites(db, resolved_start, resolved_end)
            period["terminated_sites"] = _bb_terminated_sites(db, resolved_start, resolved_end)

    # ── hr ────────────────────────────────────────────────────────────────────
    elif "hr" in depts:
        period["new_users"] = _new_users(db, resolved_start, resolved_end)

    return {"pinned": pinned, "period": period}


# ─── Map data ─────────────────────────────────────────────────────────────────

def map_data(
    db: Session,
    user: UserContext,
    project_key: Optional[str],
) -> list[dict]:
    depts = _dept_keys(user)
    if "mgmt" not in depts and "ops" not in depts:
        return []

    project_map = _load_projects(db)
    accessible_ids = _accessible_project_ids(db, user)
    badges = _load_badges(db, ["comp", "cancel", "term", "stage"])

    closed_keys = ["comp", "cancel", "term"]
    if not _include_staged(user):
        closed_keys.append("stage")
    closed_ids = [badges[k] for k in closed_keys if k in badges]

    # Determine which map-eligible projects to query
    if project_key:
        candidate_keys = [project_key] if project_key in _MAP_PROJECT_KEYS else []
    else:
        candidate_keys = list(_MAP_PROJECT_KEYS)

    map_models: dict[str, type] = {
        "ma": MASite,
        "mc": MCSite,
        "md": MDSite,
    }

    totals: dict[int, int] = {}
    project_totals: dict[int, dict[str, int]] = {}
    project_label_map: dict[str, str] = {}

    for key in candidate_keys:
        pid = project_map.get(key)
        if pid is None or pid not in accessible_ids:
            continue
        model = map_models[key]
        project_row = db.execute(select(Project).where(Project.id == pid)).scalar_one_or_none()
        if project_row:
            project_label_map[key] = project_row.label

        stmt = (
            select(model.state_id, func.count().label("cnt"))
            .where(model.active.is_(True), model.state_id.isnot(None))
            .group_by(model.state_id)
        )
        if closed_ids:
            stmt = stmt.where(model.status_id.notin_(closed_ids))

        for state_id, count in db.execute(stmt).all():
            totals[state_id] = totals.get(state_id, 0) + count
            project_totals.setdefault(state_id, {})[key] = count

    if not totals:
        return []

    states = {
        row.id: row.label
        for row in db.execute(
            select(IndianState).where(IndianState.id.in_(tuple(totals.keys())))
        ).scalars()
    }

    return sorted(
        [
            {
                "state_id": state_id,
                "label": states.get(state_id, f"State {state_id}"),
                "count": count,
                "projects": [
                    {
                        "project_key": pk,
                        "project_label": project_label_map.get(pk, pk.upper()),
                        "count": pc,
                    }
                    for pk, pc in sorted(project_totals.get(state_id, {}).items())
                ],
            }
            for state_id, count in totals.items()
        ],
        key=lambda r: (-r["count"], r["label"]),
    )
