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
from app.config.calculator import SubconAssignmentRow, RateCardRow, TransactionRow, calculate_site_financials
from app.models.acc import RateCard, Transaction
from app.models.core import Badge, IndianState, Job, JobBucket
from app.models.ops import Subcon, SubconAssignment, SubconProject
from app.schemas.site import SubconAssignmentRequest, SiteOut
from app.services.common import badge_map, get_project, get_project_config, get_site_model, get_subproject_model, model_to_dict
from app.services import acc_rules

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


def _build_financials(db: Session, project_id: int, project_key: str, site_id: int, site_data: dict) -> dict:
    badges = badge_map(db)
    # Only include assignments that have a bucket
    assignments = [
        SubconAssignmentRow(id=row.id, subcon_id=row.subcon_id, bucket_key=db.get(JobBucket, row.bucket_id).key, active=row.active)
        for row in db.execute(select(SubconAssignment).where(SubconAssignment.project_id == project_id, SubconAssignment.site_id == site_id)).scalars()
        if row.bucket_id is not None
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
    job_scales = {job.bucket_key: job.scale_by for job in db.execute(select(Job)).scalars()}
    site_data["status_key"] = badges[site_data["status_id"]].key
    return calculate_site_financials(site_data, assignments, transactions, rates, job_scales)


def _serialize_subcon_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    subcons = {
        subcon.id: subcon.name
        for subcon in db.execute(select(Subcon).where(Subcon.id.in_([int(row["subcon_id"]) for row in rows]))).scalars().all()
    }
    return [
        {
            "assignment_id": row["assignment_id"],
            "subcon_id": row["subcon_id"],
            "subcon_label": subcons.get(int(row["subcon_id"]), f"Subcon {row['subcon_id']}"),
            "bucket_key": row["bucket_key"],
            "active": row["active"],
            "cost": row["cost"],
            "paid": row["paid"],
            "balance": row["balance"],
        }
        for row in rows
    ]


def list_sites(db: Session, user: UserContext, project_key: str, exclude_staged: bool = False, subproject_id: Optional[int] = None) -> list[dict]:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    model = get_site_model(project_key)
    query = select(model).order_by(model.receiving_date.desc())
    if subproject_id is not None:
        query = query.where(model.subproject_id == subproject_id)
    rows = db.execute(query).scalars().all()
    badges = badge_map(db)
    stage_badge_id = next((bid for bid, b in badges.items() if b.key == "stage"), None)
    items = []
    for row in rows:
        if exclude_staged and stage_badge_id is not None and row.status_id == stage_badge_id:
            continue
        items.append({"id": row.id, "ckt_id": row.ckt_id, "status_key": badges[row.status_id].key, "receiving_date": row.receiving_date, "active_fe": getattr(row, "active_fe", None)})
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
    if getattr(bucket, "project_id", None) != project_id:
        logger.warning("subcon assignment validation failed: bucket outside project", extra={"project_id": project_id, "bucket_id": bucket_id, "bucket_project_id": getattr(bucket, "project_id", None)})
        raise HTTPException(status_code=400, detail="Bucket does not belong to this project")
    return bucket


def _update_active_subcon_label(db: Session, project_key: str, site_id: int, label: Optional[str]) -> None:
    db.execute(
        text(f"UPDATE schema_{project_key}.sites SET active_fe = :label WHERE id = :site_id"),
        {"label": label, "site_id": site_id},
    )


def get_site(db: Session, user: UserContext, project_key: str, site_id: int) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="read")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
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
        subcon_rows=_serialize_subcon_rows(db, financials.get("subcon_rows", [])),
    )


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
    badges_dict = badge_map(db)
    status_obj = badges_dict.get(site.status_id)
    if status_obj and status_obj.key == "comp":
        acc_rules.maybe_create_site_invoice(db, project_key, project.id, site.id, site.subproject_id)
        acc_rules.maybe_create_subproject_invoice(db, project_key, project.id, site.subproject_id)
        db.commit()

    return result


def assign_subcon(db: Session, user: UserContext, project_key: str, site_id: int, payload: SubconAssignmentRequest) -> SiteOut:
    project = get_project(db, project_key)
    ensure_permission(user, db, project_key=project_key, tag="site", action="write")
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    logger.info(
        "subcon assignment payload",
        extra={
            "project_key": project_key,
            "project_id": project.id,
            "site_id": site_id,
            "subcon_id": payload.subcon_id,
            "bucket_id": payload.bucket_id,
            "assigned_by": user.user_id,
        },
    )
    subcon = _validate_subcon_for_project(db, project.id, payload.subcon_id)
    _validate_bucket_for_project(db, project.id, payload.bucket_id)
    existing_assignments = db.execute(
        select(SubconAssignment).where(
            SubconAssignment.project_id == project.id,
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
            project_id=project.id,
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
    assignment.active = False
    assignment.removed_at = datetime.now()
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
        select(Recharge).where(Recharge.site_id == site_id).order_by(Recharge.date.desc())
    ).scalars().all()
    return [
        {
            "id": r.id,
            "site_id": r.site_id,
            "date": r.date,
            "amount": r.amount,
            "validity": r.validity,
            "uom": r.uom,
            "next_recharge_date": r.next_recharge_date,
        }
        for r in rows
    ]


def create_recharge(db: Session, user: UserContext, site_id: int, recharge_date: date, amount, validity: int, uom: str) -> dict:
    from app.models.bb import Recharge, BBSite
    ensure_permission(user, db, project_key="bb", tag="site", action="write")
    site = db.get(BBSite, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="BB site not found")
    if uom not in ("months", "days"):
        raise HTTPException(status_code=400, detail="uom must be 'months' or 'days'")
    next_recharge_date = _calc_next_recharge_date(recharge_date, validity, uom)
    row = Recharge(
        site_id=site_id,
        date=recharge_date,
        amount=amount,
        validity=validity,
        uom=uom,
        next_recharge_date=next_recharge_date,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "site_id": row.site_id,
        "date": row.date,
        "amount": row.amount,
        "validity": row.validity,
        "uom": row.uom,
        "next_recharge_date": row.next_recharge_date,
    }
