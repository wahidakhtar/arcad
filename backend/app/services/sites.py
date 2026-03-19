from __future__ import annotations

from datetime import date, datetime, timezone
import logging
from decimal import Decimal
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission
from app.config.calculator import FEAssignmentRow, RateCardRow, TransactionRow, calculate_site_financials
from app.models.acc import RateCard, Transaction
from app.models.core import Badge, IndianState, JobBucket
from app.models.hr import User
from app.models.ops import FEAssignment
from app.schemas.site import FEAssignmentRequest, SiteOut
from app.services.common import badge_map, get_project, get_site_model, get_subproject_model, model_to_dict

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

BADGE_TYPE_BY_FIELD = {
    "status": "status",
    "po_status": "doc_status",
    "invoice_status": "doc_status",
    "wcc_status": "doc_status",
    "doc_status": "doc_status",
    "fsr_status": "doc_status",
    "report_status": "doc_status",
}

TRANSITION_TYPE_BY_FIELD = {
    "status": "site",
    "wcc_status": "wcc",
    "fsr_status": "fsr",
    "report_status": "report",
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


def _parse_bool(value: Any) -> bool:
    text_value = "" if value is None else str(value).strip().lower()
    if text_value in {"", "0", "false", "no", "n"}:
        return False
    if text_value in {"1", "true", "yes", "y"}:
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
    records = db.execute(text(f"SELECT tag, type FROM schema_{project_key}.ui ORDER BY id")).mappings().all()
    return {str(record["tag"]): str(record["type"]) for record in records}


def _normalize_site_payload(db: Session, project_key: str, data: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    field_types = _field_types(db, project_key)
    model = get_site_model(project_key)
    for key, value in data.items():
        resolved_key = _resolve_site_field_key(model, key)
        field_type = field_types.get(key, FIELD_TYPE_OVERRIDES.get(key, "text"))
        if resolved_key == "state_id":
            normalized[resolved_key] = _parse_state_id(db, value)
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


def _resolve_subproject_id(db: Session, project_key: str, requested_subproject_id: int) -> int:
    subproject_model = get_subproject_model(project_key)
    existing = db.get(subproject_model, requested_subproject_id)
    if existing is not None:
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


def _site_accessible_to_fo(db: Session, project_id: int, site_id: int, fe_id: int) -> bool:
    return (
        db.execute(
            select(FEAssignment).where(
                FEAssignment.project_id == project_id,
                FEAssignment.site_id == site_id,
                FEAssignment.fe_id == fe_id,
            )
        ).scalar_one_or_none()
        is not None
    )


def _build_financials(db: Session, project_id: int, project_key: str, site_id: int, site_data: dict) -> dict:
    badges = badge_map(db)
    assignments = [
        FEAssignmentRow(fe_id=row.fe_id, bucket_key=db.get(JobBucket, row.bucket_id).key, active=row.active, final_cost=row.final_cost)
        for row in db.execute(select(FEAssignment).where(FEAssignment.project_id == project_id, FEAssignment.site_id == site_id)).scalars()
    ]
    transactions = [
        TransactionRow(
            recipient_id=row.recipient_id,
            bucket_key=row.bucket_key,
            type_key=badges[row.type_id].key,
            amount=row.amount,
            status_key=badges[row.status_id].key,
        )
        for row in db.execute(select(Transaction).where(Transaction.project_id == project_id, Transaction.site_id == site_id)).scalars()
    ]
    rates = [RateCardRow(job_key=row.job_key, effective_date=row.date, cost=row.cost) for row in db.execute(select(RateCard)).scalars()]
    site_data["status_key"] = badges[site_data["status_id"]].key
    return calculate_site_financials(site_data, assignments, transactions, rates)


def _serialize_fe_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    users = {
        user.id: user.label
        for user in db.execute(select(User).where(User.id.in_([int(row["fe_id"]) for row in rows]))).scalars().all()
    }
    return [
        {
            "fe_id": row["fe_id"],
            "fe_label": users.get(int(row["fe_id"]), f"User {row['fe_id']}"),
            "bucket_key": row["bucket_key"],
            "active": row["active"],
            "cost": row["cost"],
            "paid": row["paid"],
            "balance": row["balance"],
        }
        for row in rows
    ]


def list_sites(db: Session, user: UserContext, project_key: str) -> list[dict]:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    model = get_site_model(project_key)
    rows = db.execute(select(model).order_by(model.receiving_date.desc())).scalars().all()
    items = []
    for row in rows:
        if user.is_fo and not _site_accessible_to_fo(db, project.id, row.id, user.user_id):
            continue
        badges = badge_map(db)
        items.append({"id": row.id, "ckt_id": row.ckt_id, "status_key": badges[row.status_id].key, "receiving_date": row.receiving_date})
    return items


def create_site(db: Session, user: UserContext, project_key: str, subproject_id: int, data: dict) -> dict:
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    project = get_project(db, project_key)
    logger.info("create_site request project=%s user=%s subproject_id=%s payload=%s", project_key, user.username, subproject_id, data)
    normalized_data = _normalize_site_payload(db, project_key, data)
    resolved_subproject_id = _resolve_subproject_id(db, project_key, subproject_id)
    payload = {"subproject_id": resolved_subproject_id, **normalized_data}
    if "status_id" not in payload:
        payload["status_id"] = 20 if data.get("bulk") else 10
    try:
        site = model(**payload)
        db.add(site)
        db.commit()
        db.refresh(site)
        logger.info("create_site success project=%s inserted_id=%s ckt_id=%s", project_key, site.id, site.ckt_id)
        return model_to_dict(site)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("create_site db_error project=%s payload=%s", project_key, payload)
        raise HTTPException(status_code=400, detail="Unable to create site") from exc


def get_site(db: Session, user: UserContext, project_key: str, site_id: int) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    if user.is_fo and not _site_accessible_to_fo(db, project.id, site_id, user.user_id):
        raise HTTPException(status_code=403, detail="Site not assigned")
    site_data = model_to_dict(site)
    financials = _build_financials(db, project.id, project_key, site_id, site_data)
    badges = badge_map(db)
    return SiteOut(
        id=site.id,
        project_key=project_key,
        subproject_id=site.subproject_id,
        ckt_id=site.ckt_id,
        status_key=badges[site.status_id].key,
        receiving_date=site.receiving_date,
        fields=site_data,
        financials={k: financials[k] for k in ["budget", "cost", "paid", "balance"]},
        fe_rows=_serialize_fe_rows(db, financials.get("fe_rows", [])),
    )


def update_site(db: Session, user: UserContext, project_key: str, site_id: int, data: dict) -> dict:
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    normalized_data = _normalize_site_payload(db, project_key, data)
    for field_name in data.keys():
        ensure_permission(user, db, project_key=project_key, tag="field", action="write", field_name=field_name)
        resolved_field_name = _resolve_site_field_key(model, field_name)
        if not hasattr(site, resolved_field_name):
            raise HTTPException(status_code=400, detail=f"Unknown field: {field_name}")
        next_value = normalized_data.get(resolved_field_name)
        if field_name in TRANSITION_TYPE_BY_FIELD:
            current_value = getattr(site, resolved_field_name)
            if next_value != current_value:
                allowed_to_ids = _allowed_badge_transitions(db, project_key, field_name, int(current_value))
                if int(next_value) not in allowed_to_ids:
                    raise HTTPException(status_code=400, detail=f"Transition not allowed for {field_name}")
        setattr(site, resolved_field_name, next_value)
    db.commit()
    db.refresh(site)
    return model_to_dict(site)


def remove_fe_assignment(db: Session, user: UserContext, project_key: str, site_id: int, fe_id: int, bucket_id: int, final_cost: Optional[Decimal]) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    assignment = db.execute(
        select(FEAssignment).where(
            FEAssignment.project_id == project.id,
            FEAssignment.site_id == site_id,
            FEAssignment.bucket_id == bucket_id,
            FEAssignment.fe_id == fe_id,
            FEAssignment.active.is_(True),
        )
    ).scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Active assignment not found")
    assignment.active = False
    if final_cost is not None:
        assignment.final_cost = final_cost
    db.commit()
    return get_site(db, user, project_key, site_id)


def assign_fe(db: Session, user: UserContext, project_key: str, site_id: int, payload: FEAssignmentRequest) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    bucket = db.get(JobBucket, payload.bucket_id)
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")
    fe_user = db.get(User, payload.fe_id)
    if fe_user is None:
        raise HTTPException(status_code=404, detail="FE user not found")
    existing = db.execute(
        select(FEAssignment).where(
            FEAssignment.project_id == project.id,
            FEAssignment.site_id == site_id,
            FEAssignment.bucket_id == payload.bucket_id,
            FEAssignment.fe_id == payload.fe_id,
            FEAssignment.active.is_(True),
        )
    ).scalar_one_or_none()
    if existing is not None:
        return get_site(db, user, project_key, site_id)
    db.add(
        FEAssignment(
            project_id=project.id,
            site_id=site_id,
            bucket_id=payload.bucket_id,
            fe_id=payload.fe_id,
            active=True,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return get_site(db, user, project_key, site_id)
