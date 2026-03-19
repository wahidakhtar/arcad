from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission
from app.models.acc import Transaction
from app.models.core import Badge, IndianState, JobBucket, Project
from app.models.ops import Ticket
from app.services.common import get_project_config, get_site_model, get_subproject_model

FIELD_META: dict[str, dict[str, object]] = {
    "receiving_date": {"label": "Receiving Date", "type": "date", "list_view": True},
    "ckt_id": {"label": "Circuit ID", "type": "text", "list_view": True},
    "customer": {"label": "Customer", "type": "text", "list_view": True},
    "address": {"label": "Address", "type": "text", "list_view": False},
    "city": {"label": "City", "type": "text", "list_view": True},
    "state_id": {"label": "State", "type": "dropdown", "list_view": True},
    "lc": {"label": "LC", "type": "text", "list_view": False},
    "height": {"label": "Height (mtr)", "type": "number", "list_view": False},
    "permission_date": {"label": "Permission Date", "type": "date", "list_view": False},
    "edd": {"label": "EDD", "type": "date", "list_view": False},
    "followup_date": {"label": "Follow-up Date", "type": "date", "list_view": False},
    "visit_date": {"label": "Visit Date", "type": "date", "list_view": False},
    "outcome": {"label": "Outcome", "type": "text", "list_view": False},
    "dismantle_date": {"label": "Dismantle Date", "type": "date", "list_view": False},
    "audit_date": {"label": "Audit Date", "type": "date", "list_view": False},
    "cm_date": {"label": "CM Date", "type": "date", "list_view": False},
    "status": {"label": "Status", "type": "badge", "list_view": True},
    "status_key": {"label": "Status", "type": "badge", "list_view": True},
    "balance": {"label": "Balance", "type": "number", "list_view": True},
    "mpaint": {"label": "Painting", "type": "bool", "list_view": False},
    "mnbr": {"label": "Nut-Bolt Replacement", "type": "bool", "list_view": False},
    "arr": {"label": "Lightning Arrester", "type": "bool", "list_view": False},
    "ep": {"label": "Earthpit", "type": "bool", "list_view": False},
    "ec": {"label": "Earthing Cable", "type": "number", "list_view": False},
}


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    text_value = str(value).strip()
    if not text_value:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text_value, fmt).date()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date value: {text_value}")


def _parse_bool(value: Any) -> bool:
    text_value = "" if value is None else str(value).strip().lower()
    if text_value in {"", "0", "false", "no", "n"}:
        return False
    if text_value in {"1", "true", "yes", "y"}:
        return True
    raise HTTPException(status_code=400, detail=f"Invalid boolean value: {value}")


def _parse_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value:
        return None
    try:
        return float(text_value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid number value: {text_value}") from exc


def _parse_state_id(db: Session, value: Any) -> Optional[int]:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value:
        return None
    if text_value.isdigit():
        return int(text_value)
    match = db.execute(
        select(IndianState).where(func.lower(IndianState.label) == text_value.lower())
    ).scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=400, detail=f"Unknown state: {text_value}")
    return match.id


def _project_field_types(db: Session, project_key: str) -> dict[str, str]:
    rows = db.execute(text(f"SELECT tag, type FROM schema_{project_key}.ui ORDER BY id")).mappings().all()
    return {str(row["tag"]): str(row["type"]) for row in rows}


def _normalize_bulk_row(db: Session, project_key: str, row: dict[str, Any], field_types: dict[str, str]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key, value in row.items():
        field_type = field_types.get(key, str(FIELD_META.get(key, {}).get("type", "text")))
        if key == "state_id":
            payload[key] = _parse_state_id(db, value)
        elif field_type == "bool":
            payload[key] = _parse_bool(value)
        elif field_type == "date":
            payload[key] = _parse_date(value)
        elif field_type == "number":
            payload[key] = _parse_number(value)
        else:
            payload[key] = None if value is None or str(value).strip() == "" else str(value).strip()
    return payload


def list_projects(db: Session, user: UserContext) -> list[dict]:
    projects = db.execute(select(Project).order_by(Project.id)).scalars().all()
    rows = []
    for project in projects:
        if user.is_fo and not any(role.project_id == project.id for role in user.roles if role.project_id is not None):
            continue
        entry = {"id": project.id, "key": project.key, "label": project.label, "active": project.active, "recurring": project.recurring, "subprojects": []}
        if project.recurring and project.key in {"mi", "md", "ma", "mc", "bb"}:
            model = get_subproject_model(project.key)
            subprojects = db.execute(select(model).where(model.active.is_(True), model.bucket.is_(False)).order_by(model.batch_date.desc())).scalars().all()
            entry["subprojects"] = [{"id": subproject.id, "batch_date": subproject.batch_date} for subproject in subprojects]
        rows.append(entry)
    return rows


def sidebar_counts(db: Session) -> dict[str, int]:
    requested = db.scalar(select(func.count()).select_from(Transaction).where(Transaction.status_id == 38)) or 0
    open_tickets = db.scalar(select(func.count()).select_from(Ticket).where(Ticket.closing_date.is_(None))) or 0
    return {"transactions": requested, "tickets": open_tickets}


def list_ui_fields(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="field", action="read")
    if project_key not in {"mi", "md", "ma", "mc", "bb"}:
        return []
    rows = db.execute(
        text(f"SELECT id, label, tag, list_view, type FROM schema_{project_key}.ui ORDER BY id")
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "key": row["tag"],
            "label": row["label"],
            "list_view": row["list_view"],
            "type": row["type"],
        }
        for row in rows
    ]


def list_badge_transitions(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="field", action="read")
    try:
        rows = db.execute(
            text(
                f"""
                SELECT
                    tt.key AS transition_type,
                    bt.from_id,
                    bfrom.key AS from_key,
                    bfrom.label AS from_label,
                    bt.to_id,
                    bto.key AS to_key,
                    bto.label AS to_label
                FROM schema_{project_key}.badge_transitions bt
                JOIN schema_core.transition_types tt ON tt.id = bt.type_id
                JOIN schema_core.badges bfrom ON bfrom.id = bt.from_id
                JOIN schema_core.badges bto ON bto.id = bt.to_id
                ORDER BY tt.key, bfrom.label, bto.label
                """
            )
        ).mappings().all()
    except ProgrammingError:
        db.rollback()
        return []
    return [
        {
            "transition_type": row["transition_type"],
            "field_key": "status" if row["transition_type"] == "site" else f"{row['transition_type']}_status",
            "from_id": row["from_id"],
            "from_key": row["from_key"],
            "from_label": row["from_label"],
            "to_id": row["to_id"],
            "to_key": row["to_key"],
            "to_label": row["to_label"],
        }
        for row in rows
    ]


def list_project_buckets(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    project_config = get_project_config(project_key)
    budget_params = getattr(project_config, "budget_params", {}) or {}
    bucket_keys = [
        value
        for key, value in budget_params.items()
        if isinstance(value, str) and key.endswith("bucket")
    ]
    if not bucket_keys:
        return []
    rows = db.execute(select(JobBucket).where(JobBucket.key.in_(bucket_keys)).order_by(JobBucket.id.asc())).scalars().all()
    return [{"id": row.id, "key": row.key, "label": row.label} for row in rows]


def create_subproject(db: Session, user: UserContext, project_key: str, batch_date: str, rows: list[dict]) -> dict:
    ensure_permission(user, db, project_key=project_key, tag="subproject", action="write")
    if project_key not in {"md", "ma", "mc"}:
        raise ValueError("Subproject bulk upload is only supported for MD, MA, and MC")

    subproject_model = get_subproject_model(project_key)
    site_model = get_site_model(project_key)
    stage_badge = db.execute(select(Badge).where(Badge.key == "stage")).scalar_one()
    parsed_batch_date = _parse_date(batch_date)
    if parsed_batch_date is None:
        raise HTTPException(status_code=400, detail="Receiving date is required")
    field_types = _project_field_types(db, project_key)

    subproject = subproject_model(batch_date=parsed_batch_date, bucket=False, active=True, version=1)
    db.add(subproject)
    db.flush()

    for row in rows:
        normalized_row = _normalize_bulk_row(db, project_key, row, field_types)
        db.add(site_model(subproject_id=subproject.id, receiving_date=parsed_batch_date, status_id=stage_badge.id, **normalized_row))

    db.commit()
    return {"id": subproject.id, "batch_date": subproject.batch_date, "site_count": len(rows)}
