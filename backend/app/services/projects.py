from __future__ import annotations

from datetime import date, datetime
import difflib
import re
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission, user_project_ids
from app.models.acc import Transaction
from app.models.core import Badge, IndianState, JobBucket, Project
from app.models.ops import Subcon, SubconProject, Ticket
from app.services.common import get_project_config, get_site_model, get_subproject_model
import logging
from app.utils.normalization import normalize_identifier, validate_identifier

logger = logging.getLogger(__name__)

STATE_ALIASES = {
    "orissa": "Odisha",
    "pondicherry": "Puducherry",
    "uttaranchal": "Uttarakhand",
    "chattisgarh": "Chhattisgarh",
    "andaman and nicobar": "Andaman and Nicobar Islands",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
}

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
    "outcome": {"label": "Outcome", "type": "dropdown", "list_view": False},
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


def _normalize_state_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _suggest_state_label(db: Session, value: str) -> str | None:
    states = db.execute(select(IndianState)).scalars().all()
    normalized_to_label = { _normalize_state_token(state.label): state.label for state in states }
    normalized_to_label.update({ _normalize_state_token(state.key): state.label for state in states })
    target = _normalize_state_token(value)
    if not target:
        return None
    alias_match = STATE_ALIASES.get(target)
    if alias_match:
        return alias_match
    matches = difflib.get_close_matches(target, list(normalized_to_label.keys()), n=1, cutoff=0.82)
    if not matches:
        return None
    return normalized_to_label[matches[0]]


def _state_id_from_text(db: Session, value: Any) -> tuple[Optional[int], str | None]:
    if value is None:
        return None, None
    text_value = str(value).strip()
    if not text_value:
        return None, None
    if text_value.isdigit():
        return int(text_value), None

    states = db.execute(select(IndianState)).scalars().all()
    target = _normalize_state_token(text_value)
    for state in states:
        if target in {_normalize_state_token(state.label), _normalize_state_token(state.key)}:
            return state.id, None

    suggestion = _suggest_state_label(db, text_value)
    return None, suggestion


def _bulk_validation_error(message: str, errors: list[dict[str, Any]]) -> HTTPException:
    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for error in errors:
        suggestion = error.get("suggestion")
        if not suggestion:
            continue
        key = (error["field"], str(error.get("value", "")), suggestion)
        entry = grouped.setdefault(
            key,
            {
                "field": error["field"],
                "from_value": error.get("value", ""),
                "to_value": suggestion,
                "count": 0,
            },
        )
        entry["count"] += 1
    return HTTPException(
        status_code=400,
        detail={
            "message": message,
            "errors": errors,
            "fixes": sorted(grouped.values(), key=lambda item: (-item["count"], item["field"], item["from_value"])),
        },
    )


def _project_field_types(db: Session, project_key: str) -> dict[str, str]:
    try:
        rows = db.execute(text(f"SELECT key, type FROM schema_{project_key}.ui_fields ORDER BY id")).mappings().all()
    except SQLAlchemyError as exc:
        logger.exception("project_field_type_lookup failed project=%s", project_key)
        raise HTTPException(status_code=500, detail="Field configuration error for project") from exc
    return {str(row["key"]): str(row["type"]) for row in rows}


def _normalize_bulk_row(
    db: Session,
    project_key: str,
    row: dict[str, Any],
    field_types: dict[str, str],
    *,
    row_index: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload: dict[str, Any] = {}
    errors: list[dict[str, Any]] = []
    for key, value in row.items():
        field_type = field_types.get(key, str(FIELD_META.get(key, {}).get("type", "text")))
        if key == "state_id":
            state_id, suggestion = _state_id_from_text(db, value)
            payload[key] = state_id
            if str(value or "").strip() and state_id is None:
                errors.append(
                    {
                        "row_index": row_index,
                        "field": key,
                        "value": str(value).strip(),
                        "message": f"Unknown state: {str(value).strip()}",
                        "suggestion": suggestion,
                    }
                )
        elif field_type == "bool":
            try:
                payload[key] = _parse_bool(value)
            except HTTPException as exc:
                errors.append({"row_index": row_index, "field": key, "value": value, "message": exc.detail})
        elif field_type == "date":
            try:
                payload[key] = _parse_date(value)
            except HTTPException as exc:
                errors.append({"row_index": row_index, "field": key, "value": value, "message": exc.detail})
        elif field_type == "number":
            try:
                payload[key] = _parse_number(value)
            except HTTPException as exc:
                errors.append({"row_index": row_index, "field": key, "value": value, "message": exc.detail})
        else:
            payload[key] = None if value is None or str(value).strip() == "" else str(value).strip()
    for field_name in ("ckt_id", "po_number", "invoice_number"):
        payload[field_name] = normalize_identifier(payload.get(field_name))
        try:
            validate_identifier(payload.get(field_name))
        except ValueError as exc:
            errors.append({"row_index": row_index, "field": field_name, "value": payload.get(field_name), "message": str(exc)})
    if not payload.get("ckt_id"):
        errors.append({"row_index": row_index, "field": "ckt_id", "value": payload.get("ckt_id"), "message": "Circuit ID is required"})
    return payload, errors


def create_project(db: Session, user: UserContext, key: str, label: str) -> dict:
    ensure_permission(user, db, project_key=None, tag="project", action="write")
    existing = db.execute(select(Project).where(Project.key == key)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Project key already exists")
    project = Project(key=key, label=label, active=True, recurring=False, supports_subprojects=False)
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "key": project.key, "label": project.label, "active": project.active, "recurring": project.recurring, "supports_subprojects": project.supports_subprojects, "subprojects": []}


def list_projects(db: Session, user: UserContext) -> list[dict]:
    projects = db.execute(select(Project).order_by(Project.id)).scalars().all()
    rows = []
    for project in projects:
        if user.is_fo and not any(role.project_id == project.id for role in user.roles if role.project_id is not None):
            continue
        entry = {"id": project.id, "key": project.key, "label": project.label, "active": project.active, "recurring": project.recurring, "supports_subprojects": project.supports_subprojects, "subprojects": []}
        if project.recurring and project.key in {"mi", "md", "ma", "mc", "bb"}:
            model = get_subproject_model(project.key)
            subprojects = db.execute(select(model).where(model.active.is_(True)).order_by(model.batch_date.desc().nullslast())).scalars().all()
            entry["subprojects"] = [{"id": subproject.id, "batch_date": subproject.batch_date, "bucket": subproject.bucket} for subproject in subprojects]
        rows.append(entry)
    return rows


def sidebar_counts(db: Session, user: UserContext) -> dict[str, int]:
    project_ids = user_project_ids(user)

    tx_query = select(func.count()).select_from(Transaction).where(Transaction.status_id == 38)
    ticket_query = select(func.count()).select_from(Ticket).where(Ticket.closing_date.is_(None))

    if user.is_fo:
        tx_query = tx_query.where(Transaction.recipient_id == user.user_id)
        # FO has no ticket access — return 0
        return {"transactions": db.scalar(tx_query) or 0, "tickets": 0}

    if project_ids is not None:
        tx_query = tx_query.where(Transaction.project_id.in_(project_ids))
        ticket_query = ticket_query.where(Ticket.project_id.in_(project_ids))

    return {
        "transactions": db.scalar(tx_query) or 0,
        "tickets": db.scalar(ticket_query) or 0,
    }


def list_ui_fields(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    if project_key not in {"mi", "md", "ma", "mc", "bb"}:
        return []
    rows = db.execute(
        text(
            f"SELECT uf.id, uf.key, uf.label, uf.list_view, uf.type, uf.form_view, uf.bulk_view, "
            f"t.tag AS perm_tag "
            f"FROM schema_{project_key}.ui_fields uf "
            f"JOIN schema_core.tags t ON t.id = uf.tag_id "
            f"ORDER BY uf.id"
        )
    ).mappings().all()
    return [
        {
            "id": row["id"],
            "key": row["key"],
            "label": row["label"],
            "list_view": row["list_view"],
            "type": row["type"],
            "form_view": row["form_view"],
            "bulk_view": row["bulk_view"],
            "tag": row["perm_tag"],
        }
        for row in rows
    ]


def list_badge_transitions(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    try:
        rows = db.execute(
            text(
                f"""
                -- Site/report/wcc/fsr transitions from the project schema
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
                WHERE tt.key != 'transaction'

                UNION ALL

                -- Transaction transitions exclusively from schema_acc
                SELECT
                    tt.key AS transition_type,
                    bt.from_id,
                    bfrom.key AS from_key,
                    bfrom.label AS from_label,
                    bt.to_id,
                    bto.key AS to_key,
                    bto.label AS to_label
                FROM schema_acc.badge_transitions bt
                JOIN schema_core.transition_types tt ON tt.id = bt.type_id
                JOIN schema_core.badges bfrom ON bfrom.id = bt.from_id
                JOIN schema_core.badges bto ON bto.id = bt.to_id
                WHERE tt.key = 'transaction'

                ORDER BY transition_type, from_label, to_label
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
        if isinstance(value, str) and "bucket" in key
    ]
    if not bucket_keys:
        return []
    rows = db.execute(select(JobBucket).where(JobBucket.key.in_(bucket_keys)).order_by(JobBucket.id.asc())).scalars().all()
    return [{"id": row.id, "key": row.key, "label": row.label} for row in rows]



def list_project_subcons(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    project = db.execute(select(Project).where(Project.key == project_key)).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.execute(
        select(Subcon)
        .join(SubconProject, SubconProject.subcon_id == Subcon.id)
        .where(SubconProject.project_id == project.id, Subcon.is_active.is_(True))
        .order_by(Subcon.name.asc())
    ).scalars().all()
    return [{"id": row.id, "label": row.name} for row in rows]


def list_project_outcomes(db: Session, user: UserContext, project_key: str) -> list[dict]:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    try:
        rows = db.execute(
            text(f'SELECT id, label FROM schema_{project_key}.outcomes ORDER BY "order"')
        ).mappings().all()
    except (ProgrammingError, SQLAlchemyError):
        db.rollback()
        return []
    return [{"value": row["id"], "label": row["label"]} for row in rows]


_EXCLUDED_TX_TYPE_KEYS = {"sal", "oth"}


def list_transaction_types(db: Session, user: UserContext) -> list[dict]:
    """Return transaction type badges available for requests, excluding salary and other."""
    rows = (
        db.execute(
            select(Badge)
            .where(Badge.type == "transaction")
            .where(Badge.key.notin_(_EXCLUDED_TX_TYPE_KEYS))
            .order_by(Badge.id)
        )
        .scalars()
        .all()
    )
    return [{"id": b.id, "key": b.key, "label": b.label, "color": b.color} for b in rows]


def create_subproject(db: Session, user: UserContext, project_key: str, batch_date: str, rows: list[dict]) -> dict:
    ensure_permission(user, db, project_key=project_key, tag="subproject", action="write")
    if project_key not in {"md", "ma", "mc"}:
        raise HTTPException(status_code=400, detail="Subproject bulk upload is only supported for MD, MA, and MC projects.")

    subproject_model = get_subproject_model(project_key)
    site_model = get_site_model(project_key)
    stage_badge = db.execute(select(Badge).where(Badge.key == "stage")).scalar_one()
    parsed_batch_date = _parse_date(batch_date)
    if parsed_batch_date is None:
        raise HTTPException(status_code=400, detail="Receiving date is required")
    field_types = _project_field_types(db, project_key)

    seen_ckt_ids: set[str] = set()
    normalized_rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for row_index, row in enumerate(rows):
        normalized_row, row_errors = _normalize_bulk_row(db, project_key, row, field_types, row_index=row_index)
        errors.extend(row_errors)
        ckt_id = normalized_row.get("ckt_id")
        if ckt_id:
            if ckt_id in seen_ckt_ids:
                errors.append(
                    {
                        "row_index": row_index,
                        "field": "ckt_id",
                        "value": ckt_id,
                        "message": "Circuit already exists in this subproject upload",
                    }
                )
            seen_ckt_ids.add(ckt_id)
        normalized_rows.append(normalized_row)

    if errors:
        raise _bulk_validation_error("Please fix the highlighted cells and submit again.", errors)

    subproject = subproject_model(batch_date=parsed_batch_date, bucket=False, active=True, version=1)
    db.add(subproject)
    db.flush()

    for normalized_row in normalized_rows:
        db.add(site_model(subproject_id=subproject.id, receiving_date=parsed_batch_date, status_id=stage_badge.id, **normalized_row))

    db.commit()
    return {"id": subproject.id, "batch_date": subproject.batch_date, "site_count": len(rows)}
