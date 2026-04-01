from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import logging
from decimal import Decimal
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission
from app.models.core import Badge, IndianState, JobBucket
from app.models.md import MDOutcome
from app.models.ops import Subcon, SubconAssignment, SubconProject
from app.schemas.site import SubconAssignmentRequest, SiteOut
from app.services.common import badge_map, get_project, get_project_config, get_site_model, get_subproject_model, model_to_dict
from app.services import acc_rules
from app.services.site_views import build_site_financials, get_site_projection
from app.utils.normalization import normalize_identifier, validate_identifier

logger = logging.getLogger(__name__)

FIELD_TYPE_OVERRIDES = {
    "state_id": "dropdown",
    "height": "number",
    "receiving_date": "date",
    "permission_date": "date",
    "edd": "date",
    "followup_date": "date",
    "visit_date": "date",
    "dismantle_date": "date",
    "audit_date": "date",
    "cm_date": "date",
    "mpaint": "bool",
    "mnbr": "bool",
    "arr": "bool",
    "ep": "bool",
    "ec": "number",
}

PROJECT_COMPLETION_FIELD = {
    "mi": "completion_date",
    "md": "dismantle_date",
    "ma": "audit_date",
    "mc": "cm_date",
}

BADGE_TYPE_BY_FIELD = {
    "status": "status",
    "po_status": "doc_status",
    "invoice_status": "doc_status",
    "wcc_status": "doc_status",
}

TRANSITION_TYPE_BY_FIELD = {
    "status": "site",
    "wcc_status": "wcc",
    "invoice_status": "invoice",
}


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    text_value = str(value).strip()
    if not text_value:
        return None
    for separator in ("-", "/"):
        parts = text_value.split(separator)
        if len(parts) == 3:
            if len(parts[0]) == 4:
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            if len(parts[2]) == 4:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
    raise HTTPException(status_code=400, detail=f"Invalid date value: {text_value}")


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


def _site_field_label(field_name: str) -> str:
    labels = {
        "receiving_date": "Receiving Date",
        "permission_date": "Permission Date",
        "completion_date": "Completion Date",
        "dismantle_date": "Dismantle Date",
        "audit_date": "Audit Date",
        "cm_date": "CM Date",
    }
    return labels.get(field_name, field_name.replace("_", " ").title())


def _validate_no_future_site_dates(payload: dict[str, Any]) -> None:
    today = date.today()
    for field_name, value in payload.items():
        if isinstance(value, date) and value > today:
            raise HTTPException(
                status_code=400,
                detail=f"{_site_field_label(field_name)} cannot be later than today.",
            )


def _validate_site_date_order(site: Any, project_key: str, payload: dict[str, Any]) -> None:
    completion_field = PROJECT_COMPLETION_FIELD.get(project_key)
    receiving_date = payload.get("receiving_date", getattr(site, "receiving_date", None))
    permission_date = payload.get("permission_date", getattr(site, "permission_date", None))
    completion_date = payload.get(completion_field, getattr(site, completion_field, None)) if completion_field else None
    visit_date = payload.get("visit_date", getattr(site, "visit_date", None))

    if receiving_date and permission_date and permission_date < receiving_date:
        raise HTTPException(
            status_code=400,
            detail=f"Permission Date cannot be earlier than Receiving Date. Edit/remove Receiving Date first.",
        )
    if project_key == "md" and permission_date and visit_date and visit_date < permission_date:
        raise HTTPException(
            status_code=400,
            detail="Visit Date cannot be earlier than Permission Date. Edit/remove Permission Date first.",
        )
    if project_key == "md" and receiving_date and visit_date and visit_date < receiving_date:
        raise HTTPException(
            status_code=400,
            detail="Visit Date cannot be earlier than Receiving Date. Edit/remove Receiving Date first.",
        )
    if project_key == "md" and visit_date and completion_date and completion_date < visit_date:
        raise HTTPException(
            status_code=400,
            detail=f"{_site_field_label(completion_field)} cannot be earlier than Visit Date. Edit/remove Visit Date first.",
        )
    if permission_date and completion_date and completion_date < permission_date:
        raise HTTPException(
            status_code=400,
            detail=f"{_site_field_label(completion_field)} cannot be earlier than Permission Date. Edit/remove Permission Date first.",
        )
    if receiving_date and completion_date and completion_date < receiving_date:
        raise HTTPException(
            status_code=400,
            detail=f"{_site_field_label(completion_field)} cannot be earlier than Receiving Date. Edit/remove Receiving Date first.",
        )


def _parse_bool(value: Any) -> bool:
    text_value = "" if value is None else str(value).strip().lower()
    if text_value in {"", "0", "false", "no", "n", "not required", "not_required", "notrequired"}:
        return False
    if text_value in {"1", "true", "yes", "y", "required"}:
        return True
    raise HTTPException(status_code=400, detail=f"Invalid boolean value: {value}")


def _parse_state_id(db: Session, value: Any) -> Optional[int]:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value:
        return None
    if text_value.isdigit():
        return int(text_value)
    state = db.execute(select(IndianState).where(IndianState.label.ilike(text_value))).scalar_one_or_none()
    if state is None:
        raise HTTPException(status_code=400, detail=f"Unknown state: {text_value}")
    return state.id


def _parse_badge_id(db: Session, value: Any, badge_type: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value:
        return None
    if text_value.isdigit():
        return int(text_value)
    query = select(Badge)
    if badge_type:
        query = query.where(Badge.type == badge_type)
    badge = db.execute(query.where((Badge.key.ilike(text_value)) | (Badge.label.ilike(text_value)))).scalar_one_or_none()
    if badge is None:
        raise HTTPException(status_code=400, detail=f"Unknown badge value: {text_value}")
    return badge.id


def _parse_md_outcome_id(db: Session, value: Any) -> Optional[int]:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value:
        return None
    if text_value.isdigit():
        outcome = db.get(MDOutcome, int(text_value))
        if outcome is None:
            raise HTTPException(status_code=400, detail="Unknown outcome")
        return outcome.id
    outcome = db.execute(select(MDOutcome).where(MDOutcome.label.ilike(text_value))).scalar_one_or_none()
    if outcome is None:
        raise HTTPException(status_code=400, detail=f"Unknown outcome: {text_value}")
    return outcome.id


def _resolve_site_field_key(model: type, field_name: str) -> str:
    if hasattr(model, field_name):
        return field_name
    suffixed = f"{field_name}_id"
    if hasattr(model, suffixed):
        return suffixed
    return field_name


def _allowed_badge_transitions(db: Session, project_key: str, field_name: str, from_id: int) -> list[int]:
    transition_type = TRANSITION_TYPE_BY_FIELD.get(field_name)
    if transition_type is None:
        return []
    try:
        rows = db.execute(
            text(
                f"""
                SELECT bt.to_id
                FROM schema_{project_key}.badge_transitions bt
                JOIN schema_core.transition_types tt ON tt.id = bt.type_id
                WHERE tt.key = :transition_type AND bt.from_id = :from_id
                """
            ),
            {"transition_type": transition_type, "from_id": from_id},
        ).mappings().all()
    except ProgrammingError:
        db.rollback()
        return []
    return [int(row["to_id"]) for row in rows]


def _field_types(db: Session, project_key: str) -> dict[str, str]:
    from sqlalchemy import text
    try:
        records = db.execute(text(f"SELECT key, type FROM schema_{project_key}.ui_fields ORDER BY id")).mappings().all()
    except SQLAlchemyError as exc:
        logger.exception("field_type_lookup failed project=%s", project_key)
        raise HTTPException(status_code=500, detail="Field configuration error for project") from exc
    return {str(record["key"]): str(record["type"]) for record in records}


def _normalize_site_payload(db: Session, project_key: str, data: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    field_types = _field_types(db, project_key)
    model = get_site_model(project_key)
    for key, value in data.items():
        resolved_key = _resolve_site_field_key(model, key)
        field_type = field_types.get(key, FIELD_TYPE_OVERRIDES.get(key, "text"))
        if resolved_key == "state_id":
            normalized[resolved_key] = _parse_state_id(db, value)
        elif project_key == "md" and resolved_key == "outcome_id":
            normalized[resolved_key] = _parse_md_outcome_id(db, value)
        elif field_type == "badge":
            normalized[resolved_key] = _parse_badge_id(db, value, BADGE_TYPE_BY_FIELD.get(key))
        elif field_type == "date":
            normalized[resolved_key] = _parse_date(value)
        elif field_type == "number":
            normalized[resolved_key] = _parse_number(value)
        elif field_type == "bool":
            normalized[resolved_key] = _parse_bool(value)
        else:
            normalized[resolved_key] = None if value is None or str(value).strip() == "" else str(value).strip()
    return normalized


def _normalize_identifier_fields(payload: dict[str, Any]) -> None:
    for field_name in ("ckt_id", "po_number", "invoice_number"):
        if field_name not in payload:
            continue
        payload[field_name] = normalize_identifier(payload.get(field_name))
        try:
            validate_identifier(payload.get(field_name))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


def _sync_site_active_flag(
    payload: dict[str, Any],
    badges_dict: dict[int, Badge],
    *,
    current_status_id: Optional[int] = None,
    default_active: bool = False,
) -> None:
    target_status_id = payload.get("status_id", current_status_id)
    if target_status_id is None:
        if default_active:
            payload.setdefault("active", True)
        return
    target_status = badges_dict.get(int(target_status_id))
    current_status = badges_dict.get(int(current_status_id)) if current_status_id is not None else None
    if target_status and target_status.key == "comp":
        payload["active"] = False
    elif current_status and current_status.key == "comp" and (target_status is None or target_status.key != "comp"):
        payload["active"] = True
    elif default_active:
        payload.setdefault("active", True)


def _ensure_active_circuit_unique(
    db: Session,
    model: type,
    *,
    subproject_id: Optional[int],
    ckt_id: Optional[str],
    site_id: Optional[int] = None,
    active: bool = True,
) -> None:
    if not active or subproject_id is None or not ckt_id:
        return
    query = select(model).where(
        model.subproject_id == subproject_id,
        model.ckt_id == ckt_id,
        model.active.is_(True),
    )
    if site_id is not None:
        query = query.where(model.id != site_id)
    existing = db.execute(query).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Circuit already exists in this subproject")


def _resolve_subproject_id(db: Session, project_key: str, requested_subproject_id: int | None) -> int:
    subproject_model = get_subproject_model(project_key)
    if requested_subproject_id and requested_subproject_id > 0:
        existing = db.get(subproject_model, requested_subproject_id)
        if existing is None:
            raise HTTPException(status_code=404, detail="Subproject not found")
        return requested_subproject_id

    bucket = db.execute(select(subproject_model).where(subproject_model.bucket.is_(True))).scalar_one_or_none()
    if bucket is not None:
        return bucket.id

    payload = {"batch_date": None, "bucket": True, "active": True}
    if hasattr(subproject_model, "version"):
        payload["version"] = 1
    bucket = subproject_model(**payload)
    db.add(bucket)
    db.flush()
    logger.info("create_site created_bucket_subproject project=%s bucket_id=%s", project_key, bucket.id)
    return bucket.id


def _build_financials(db: Session, project_id: int, project_key: str, site_id: int, site_data: dict) -> dict:
    return build_site_financials(db, project_id, project_key, site_id, site_data)


def _serialize_subcon_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    from app.services.site_views import serialize_subcon_rows

    return serialize_subcon_rows(db, rows)


def list_sites(
    db: Session,
    user: UserContext,
    project_key: str,
    exclude_staged: bool = False,
    subproject_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
) -> dict:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    model = get_site_model(project_key)
    query = select(model).order_by(model.receiving_date.desc())
    if subproject_id is not None:
        query = query.where(model.subproject_id == subproject_id)
    if search:
        query = query.where(model.ckt_id.ilike(f"%{search}%"))
    rows = db.execute(query).scalars().all()
    badges = badge_map(db)
    stage_badge_id = next((bid for bid, b in badges.items() if b.key == "stage"), None)

    # Batch-fetch PO and invoice statuses for all sites in this project
    from app.models.acc import Invoice, PO
    pos = db.execute(select(PO).where(PO.project_id == project.id)).scalars().all()
    po_by_site: dict[int, PO] = {po.site_id: po for po in pos if po.site_id is not None}
    po_ids = [po.id for po in pos if po.site_id is not None]
    inv_by_po: dict[int, Invoice] = {}
    if po_ids:
        for inv in db.execute(select(Invoice).where(Invoice.po_id.in_(po_ids)).order_by(Invoice.id.desc())).scalars().all():
            inv_by_po.setdefault(inv.po_id, inv)

    def _badge_dict(badge_id: int | None) -> dict | None:
        if badge_id is None:
            return None
        b = badges.get(badge_id)
        return {"id": badge_id, "label": b.label, "color": b.color} if b else None

    all_items = []
    for row in rows:
        if exclude_staged and stage_badge_id is not None and row.status_id == stage_badge_id:
            continue
        item = {"id": row.id, "ckt_id": row.ckt_id, "status_key": badges[row.status_id].key, "receiving_date": row.receiving_date, "active_fe": getattr(row, "active_fe", None)}
        financials = build_site_financials(db, project.id, project_key, row.id, model_to_dict(row))
        item.update({"budget": financials["budget"], "cost": financials["cost"], "paid": financials["paid"], "balance": financials["balance"]})
        po = po_by_site.get(row.id)
        inv = inv_by_po.get(po.id) if po else None
        item["po_number"] = po.po_no if po else None
        item["po_status"] = _badge_dict(po.po_status_id if po else None)
        item["po_status_id"] = po.po_status_id if po else None
        item["invoice_number"] = inv.invoice_no if inv else None
        item["invoice_status"] = _badge_dict(inv.invoice_status_id if inv else None)
        item["invoice_status_id"] = inv.invoice_status_id if inv else None
        all_items.append(item)
    total = len(all_items)
    page_size = max(1, page_size)
    pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, pages))
    offset = (page - 1) * page_size
    return {"items": all_items[offset: offset + page_size], "total": total, "page": page, "page_size": page_size, "pages": pages}


def create_site(db: Session, user: UserContext, project_key: str, subproject_id: int | None, data: dict) -> dict:
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    project = get_project(db, project_key)
    logger.info("create_site request project=%s user=%s subproject_id=%s payload=%s", project_key, user.username, subproject_id, data)
    normalized_data = _normalize_site_payload(db, project_key, data)
    _validate_no_future_site_dates(normalized_data)
    resolved_subproject_id = _resolve_subproject_id(db, project_key, subproject_id)
    subproject_model = get_subproject_model(project_key)
    resolved_subproject = db.get(subproject_model, resolved_subproject_id)
    if resolved_subproject is None:
        raise HTTPException(status_code=404, detail="Subproject not found")
    payload = {"subproject_id": resolved_subproject_id, **normalized_data}
    if "status_id" not in payload:
        badges = badge_map(db)
        stage_badge_id = next((badge_id for badge_id, badge in badges.items() if badge.key == "stage"), None)
        permission_wait_badge_id = next((badge_id for badge_id, badge in badges.items() if badge.key == "p_wait"), None)
        down_badge_id = next((badge_id for badge_id, badge in badges.items() if badge.key == "down"), None)
        payload["status_id"] = (
            down_badge_id
            if project_key == "bb"
            else (
                stage_badge_id
                if data.get("bulk") or not getattr(resolved_subproject, "bucket", False)
                else permission_wait_badge_id
            )
        )
        if payload["status_id"] is None:
            raise HTTPException(status_code=500, detail="Required site badges are not configured")
    _normalize_identifier_fields(payload)
    _sync_site_active_flag(payload, badge_map(db), default_active=True)
    _ensure_active_circuit_unique(
        db,
        model,
        subproject_id=payload.get("subproject_id"),
        ckt_id=payload.get("ckt_id"),
        active=bool(payload.get("active", True)),
    )
    try:
        site = model(**payload)
        db.add(site)
        db.commit()
        db.refresh(site)
        logger.info("create_site success project=%s inserted_id=%s ckt_id=%s", project_key, site.id, site.ckt_id)
        if project_key == "bb":
            acc_rules.create_bb_site_po(db, site.id)
        else:
            acc_rules.create_site_po_if_needed(db, project_key, project.id, site.id, resolved_subproject_id)
        db.commit()
        return model_to_dict(site)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("create_site db_error project=%s payload=%s", project_key, payload)
        raise HTTPException(status_code=400, detail="Unable to create site") from exc

def _validate_subcon_for_project(db: Session, project_id: int, subcon_id: int) -> Subcon:
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        logger.warning("subcon assignment validation failed: subcon not found", extra={"project_id": project_id, "subcon_id": subcon_id})
        raise HTTPException(status_code=404, detail="Subcon not found")
    if not subcon.is_active:
        logger.warning("subcon assignment validation failed: subcon inactive", extra={"project_id": project_id, "subcon_id": subcon_id})
        raise HTTPException(status_code=400, detail="Subcon is inactive")
    project_link = db.execute(
        select(SubconProject).where(SubconProject.project_id == project_id, SubconProject.subcon_id == subcon_id)
    ).scalar_one_or_none()
    if project_link is None:
        logger.warning("subcon assignment validation failed: subcon not linked to project", extra={"project_id": project_id, "subcon_id": subcon_id})
        raise HTTPException(status_code=400, detail="Subcon is not assigned to this project")
    return subcon


def _validate_bucket_for_project(db: Session, project_id: int, bucket_id: Optional[int]) -> Optional[JobBucket]:
    if bucket_id is None:
        return None
    bucket = db.get(JobBucket, bucket_id)
    if bucket is None:
        logger.warning("subcon assignment validation failed: bucket not found", extra={"project_id": project_id, "bucket_id": bucket_id})
        raise HTTPException(status_code=404, detail="Bucket not found")
    return bucket


def _update_active_subcon_label(db: Session, project_key: str, site_id: int, label: Optional[str]) -> None:
    field_name = "active_provider" if project_key == "bb" else "active_fe"
    db.execute(
        text(f"UPDATE schema_{project_key}.sites SET {field_name} = :label WHERE id = :site_id"),
        {"label": label, "site_id": site_id},
    )


def _can_deploy_staged_site(user: UserContext, project_id: int) -> bool:
    allowed_roles = {("ops", "l3"), ("mgmt", "l2"), ("mgmt", "l3")}
    for role in user.roles:
        if (role.dept_key, role.level_key) not in allowed_roles:
            continue
        if role.global_scope or role.project_id == project_id:
            return True
    return False


def _remove_active_assignment_with_current_cost(
    db: Session,
    *,
    project_id: int,
    project_key: str,
    site_id: int,
    bucket_key: str,
) -> None:
    active_assignment = db.execute(
        select(SubconAssignment).where(
            SubconAssignment.project_id == project_id,
            SubconAssignment.site_id == site_id,
            SubconAssignment.active.is_(True),
        )
    ).scalar_one_or_none()
    if active_assignment is None or active_assignment.bucket_id is None:
        return
    bucket = db.get(JobBucket, active_assignment.bucket_id)
    if bucket is None or bucket.key != bucket_key:
        return
    projection = get_site_projection(db, project_key, site_id)
    if projection is None:
        return
    current_row = next(
        (row for row in projection.get("subcon_rows", []) if row["assignment_id"] == active_assignment.id and row["active"]),
        None,
    )
    active_assignment.active = False
    active_assignment.removed_at = datetime.now()
    active_assignment.removed_cost = current_row["cost"] if current_row is not None else Decimal("0")
    active_assignment.version = (active_assignment.version or 0) + 1
    _update_active_subcon_label(db, project_key, site_id, None)


def get_site(db: Session, user: UserContext, project_key: str, site_id: int) -> SiteOut:
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    projection = get_site_projection(db, project_key, site_id)
    if projection is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return SiteOut(**projection)


def deploy_site(db: Session, user: UserContext, project_key: str, site_id: int) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    if not _can_deploy_staged_site(user, project.id):
        raise HTTPException(status_code=403, detail="Only Ops L3 or Mgmt L2/L3 can deploy staged sites")

    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    badges = badge_map(db)
    stage_badge = next((badge for badge in badges.values() if badge.key == "stage"), None)
    permission_wait_badge = next((badge for badge in badges.values() if badge.key == "p_wait"), None)
    if stage_badge is None or permission_wait_badge is None:
        raise HTTPException(status_code=500, detail="Required site badges are not configured")
    if site.status_id != stage_badge.id:
        raise HTTPException(status_code=400, detail="Only staged sites can be deployed")

    site.status_id = permission_wait_badge.id
    if hasattr(site, "active"):
        site.active = True
    if hasattr(site, "version"):
        site.version = (site.version or 0) + 1
    db.commit()
    return get_site(db, user, project_key, site_id)


def update_site(db: Session, user: UserContext, project_key: str, site_id: int, data: dict) -> dict:
    project = get_project(db, project_key)
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    # Permission check for user-provided fields
    for field_name in data.keys():
        ensure_permission(user, db, project_key=project_key, tag="field", action="write", field_name=field_name)

    # Normalize payload
    normalized_data = _normalize_site_payload(db, project_key, data)
    _validate_no_future_site_dates(normalized_data)

    # Badge transition check for user-provided badge fields BEFORE rules
    user_badge_fields = {f for f in data if f in TRANSITION_TYPE_BY_FIELD}
    original_normalized = dict(normalized_data)
    for field_name in user_badge_fields:
        resolved_field_name = _resolve_site_field_key(model, field_name)
        next_value = original_normalized.get(resolved_field_name)
        if next_value is None:
            continue
        current_value = getattr(site, resolved_field_name)
        if next_value != current_value:
            allowed_to_ids = _allowed_badge_transitions(db, project_key, field_name, int(current_value))
            if int(next_value) not in allowed_to_ids:
                raise HTTPException(status_code=400, detail=f"Transition not allowed for {field_name}")

    # Call project rules
    config = get_project_config(project_key)
    apply_fn = getattr(config, f"apply_{project_key}_rules", None)
    if apply_fn:
        normalized_data = apply_fn(site, normalized_data, db)

    _validate_site_date_order(site, project_key, normalized_data)
    _normalize_identifier_fields(normalized_data)
    badges_dict = badge_map(db)
    _sync_site_active_flag(normalized_data, badges_dict, current_status_id=site.status_id)
    if project_key == "md" and "outcome_id" in normalized_data:
        outcome = db.get(MDOutcome, normalized_data["outcome_id"]) if normalized_data["outcome_id"] is not None else None
        if outcome is not None and outcome.label == "Dismantle":
            _remove_active_assignment_with_current_cost(
                db,
                project_id=project.id,
                project_key=project_key,
                site_id=site.id,
                bucket_key="bmdv",
            )
    _ensure_active_circuit_unique(
        db,
        model,
        subproject_id=int(normalized_data.get("subproject_id", site.subproject_id)),
        ckt_id=normalized_data.get("ckt_id", site.ckt_id),
        site_id=site.id,
        active=bool(normalized_data.get("active", site.active)),
    )

    # Apply all fields from normalized_data (including system-generated ones)
    for field_name, value in normalized_data.items():
        if hasattr(site, field_name):
            setattr(site, field_name, value)

    # Version bump
    if hasattr(site, "version"):
        site.version = (site.version or 0) + 1

    db.commit()
    db.refresh(site)
    result = model_to_dict(site)

    # ACC invoice trigger: check if site just reached comp
    status_obj = badges_dict.get(site.status_id)
    if status_obj and status_obj.key == "comp":
        acc_rules.maybe_create_site_invoice(db, project_key, project.id, site.id, site.subproject_id)
        acc_rules.maybe_create_subproject_invoice(db, project_key, project.id, site.subproject_id)
        db.commit()

    return result


def assign_subcon(db: Session, user: UserContext, project_key: str, site_id: int, payload: SubconAssignmentRequest) -> SiteOut:
    project = get_project(db, project_key)
    project_id = project.id
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    logger.info(
        "subcon assignment payload",
        extra={
            "project_key": project_key,
            "project_id": project_id,
            "site_id": site_id,
            "subcon_id": payload.subcon_id,
            "bucket_id": payload.bucket_id,
            "assigned_by": user.user_id,
        },
    )
    subcon = _validate_subcon_for_project(db, project_id, payload.subcon_id)
    _validate_bucket_for_project(db, project_id, payload.bucket_id)
    existing_assignments = db.execute(
        select(SubconAssignment).where(
            SubconAssignment.project_id == project_id,
            SubconAssignment.site_id == site_id,
            SubconAssignment.active.is_(True),
        )
    ).scalars().all()
    for existing in existing_assignments:
        existing.active = False
        existing.removed_at = datetime.now()
        existing.version = (existing.version or 0) + 1
    db.add(
        SubconAssignment(
            project_id=project_id,
            site_id=site_id,
            subcon_id=payload.subcon_id,
            bucket_id=payload.bucket_id,
            active=True,
            assigned_by=user.user_id,
            assigned_at=datetime.now(),
            removed_at=None,
            version=1,
        )
    )
    _update_active_subcon_label(db, project_key, site_id, subcon.name)

    try:
        logger.info(
            "subcon assignment commit start",
            extra={
                "project_key": project_key,
                "site_id": site_id,
                "subcon_id": payload.subcon_id,
                "bucket_id": payload.bucket_id,
            },
        )
        db.commit()
        logger.info(
            "subcon assignment commit success",
            extra={
                "project_key": project_key,
                "site_id": site_id,
                "subcon_id": payload.subcon_id,
                "bucket_id": payload.bucket_id,
            },
        )
    except Exception:
        logger.exception(
            "subcon assignment commit failed",
            extra={
                "project_key": project_key,
                "site_id": site_id,
                "subcon_id": payload.subcon_id,
                "bucket_id": payload.bucket_id,
            },
        )
        raise
    logger.info(
        "subcon assignment success before return",
        extra={
            "project_key": project_key,
            "site_id": site_id,
            "subcon_id": payload.subcon_id,
            "bucket_id": payload.bucket_id,
        },
    )
    return get_site(db, user, project_key, site_id)


def create_termination(db: Session, user: UserContext, project_key: str, site_id: int, termination_date: date) -> dict:
    if project_key != "bb":
        raise HTTPException(status_code=400, detail="Terminations are only supported for BB sites")
    from app.models.bb import Termination
    from app.models.acc import Invoice, PO
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    if termination_date > date.today():
        raise HTTPException(status_code=400, detail="Termination Date cannot be later than today.")
    existing = db.get(Termination, site_id)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Termination already exists for this site")

    termination = Termination(site_id=site_id, date=termination_date)
    db.add(termination)

    badges = badge_map(db)
    term_id = next((bid for bid, b in badges.items() if b.key == "term"), None)
    if term_id:
        site.status_id = term_id
    if hasattr(site, "version"):
        site.version = (site.version or 0) + 1

    # Cancel pending invoices on the site's active PO
    pend_id = next((bid for bid, b in badges.items() if b.type == "doc_status" and b.key == "pend"), None)
    canc_id = next((bid for bid, b in badges.items() if b.type == "doc_status" and b.key == "canc"), None)
    if pend_id is not None and canc_id is not None:
        po = db.execute(
            select(PO).where(PO.project_id == project.id, PO.site_id == site_id)
        ).scalar_one_or_none()
        if po is not None:
            pending_invoices = db.execute(
                select(Invoice).where(Invoice.po_id == po.id, Invoice.invoice_status_id == pend_id)
            ).scalars().all()
            for inv in pending_invoices:
                inv.invoice_status_id = canc_id

    db.commit()
    db.refresh(site)
    return model_to_dict(site)


def remove_assignment(db: Session, user: UserContext, project_key: str, site_id: int, assignment_id: int, final_cost: Optional[Decimal]) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    assignment = db.execute(
        select(SubconAssignment).where(
            SubconAssignment.id == assignment_id,
            SubconAssignment.site_id == site_id,
            SubconAssignment.active.is_(True),
        )
    ).scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Active assignment not found")
    if final_cost is None:
        raise HTTPException(status_code=400, detail="Final cost is required")
    assignment.active = False
    assignment.removed_at = datetime.now()
    assignment.removed_cost = final_cost
    assignment.version = (assignment.version or 0) + 1
    _update_active_subcon_label(db, project_key, site_id, None)
    db.commit()
    return get_site(db, user, project_key, site_id)


# ---------------------------------------------------------------------------
# BB recharge
# ---------------------------------------------------------------------------

def _calc_next_recharge_date(recharge_date: date, validity: int, uom: str) -> date:
    if uom == "months":
        import calendar
        month = recharge_date.month - 1 + validity
        year = recharge_date.year + month // 12
        month = month % 12 + 1
        day = min(recharge_date.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)
    return recharge_date + timedelta(days=validity)


def list_recharges(db: Session, user: UserContext, site_id: int) -> list[dict]:
    from app.models.bb import Recharge
    ensure_permission(user, db, project_key="bb", tag="site", action="read")
    rows = db.execute(
        select(Recharge).where(Recharge.site_id == site_id, Recharge.date.is_not(None)).order_by(Recharge.date.desc())
    ).scalars().all()
    return [
        {
            "id": r.id,
            "site_id": r.site_id,
            "date": r.date,
            "amount": r.amount,
            "validity": r.validity,
            "uom": "months" if r.months else "days",
            "next_recharge_date": r.next_recharge_date,
        }
        for r in rows
    ]


def create_recharge(db: Session, user: UserContext, site_id: int, recharge_date: date, amount, validity: int, uom: str) -> dict:
    from app.models.bb import Recharge, BBSite, Termination
    ensure_permission(user, db, project_key="bb", tag="site", action="write")
    site = db.get(BBSite, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="BB site not found")
    if recharge_date > date.today():
        raise HTTPException(status_code=400, detail="Recharge Date cannot be later than today.")
    if db.get(Termination, site_id) is not None:
        raise HTTPException(status_code=400, detail="Cannot add recharge for a terminated BB site")
    if uom not in ("months", "days"):
        raise HTTPException(status_code=400, detail="uom must be 'months' or 'days'")
    next_recharge_date = _calc_next_recharge_date(recharge_date, validity, uom)
    row = Recharge(
        site_id=site_id,
        date=recharge_date,
        amount=amount,
        validity=validity,
        months=(uom == "months"),
        next_recharge_date=next_recharge_date,
    )
    db.add(row)
    acc_rules.set_bb_site_live_if_needed(db, site_id)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "site_id": row.site_id,
        "date": row.date,
        "amount": row.amount,
        "validity": row.validity,
        "uom": "months" if row.months else "days",
        "next_recharge_date": row.next_recharge_date,
    }


def create_recharge_request(db: Session, user: UserContext, site_id: int, amount, validity: int, uom: str) -> dict:
    from app.models.bb import BBSite, Termination
    from app.models.core import Badge
    from app.schemas.transaction import TransactionCreate
    from app.services import transactions as transaction_service

    ensure_permission(user, db, project_key="bb", tag="request", action="write")
    site = db.get(BBSite, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="BB site not found")
    if db.get(Termination, site_id) is not None:
        raise HTTPException(status_code=400, detail="Cannot request recharge for a terminated BB site")
    if uom not in {"months", "days"}:
        raise HTTPException(status_code=400, detail="uom must be 'months' or 'days'")
    if validity <= 0:
        raise HTTPException(status_code=400, detail="validity must be greater than 0")

    type_badge = db.execute(select(Badge).where(Badge.type == "transaction", Badge.key == "fe_pay")).scalar_one_or_none()
    if type_badge is None:
        raise HTTPException(status_code=500, detail="FE payment transaction badge is not configured")

    tx = transaction_service.create_transaction(
        db,
        TransactionCreate(
            project_id=get_project(db, "bb").id,
            site_id=site_id,
            recipient_type_id=None,
            recipient_id=None,
            type_id=type_badge.id,
            amount=amount,
            remarks=f"Recharge request • {validity} {'months' if uom == 'months' else 'days'}",
            recharge_validity=validity,
            recharge_uom=uom,
        ),
    )
    return model_to_dict(tx)
