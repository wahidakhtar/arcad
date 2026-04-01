from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO, RateCard
from app.models.core import Badge, Job, Project
from app.models.updates import Update
from app.services import acc_rules
from app.services.common import format_subproject_label, get_site_model, get_subproject_model
from app.schemas.billing import InvoiceCreate, POCreate, RateCardCreate

# acc department badge id (used for PO-level updates)
_ACC_DEPT_ID = 2


def _ensure_not_future(value: date | None, label: str) -> None:
    if value is not None and value > date.today():
        raise HTTPException(status_code=400, detail=f"{label} cannot be later than today.")


def list_jobs(db: Session) -> list[Job]:
    return db.execute(select(Job).order_by(Job.id)).scalars().all()


def create_rate_card(db: Session, payload: RateCardCreate) -> dict:
    job = db.get(Job, payload.job_id)
    if job is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Job not found")
    row = RateCard(job_id=payload.job_id, date=payload.date, cost=payload.cost)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "job_id": row.job_id,
        "job_key": job.job_key,
        "job_label": job.label,
        "date": row.date,
        "cost": row.cost,
    }


def list_rate_card(db: Session) -> list[dict]:
    rows = db.execute(
        select(RateCard, Job.job_key.label("job_key"), Job.label.label("job_label"))
        .join(Job, Job.id == RateCard.job_id)
        .order_by(RateCard.job_id.asc(), RateCard.date.desc())
    ).all()
    return [
        {
            "id": row.RateCard.id,
            "job_id": row.RateCard.job_id,
            "job_key": row.job_key,
            "job_label": row.job_label,
            "date": row.RateCard.date,
            "cost": row.RateCard.cost,
        }
        for row in rows
    ]


def list_rate_card_latest(db: Session) -> list[dict]:
    """Return only the latest effective rate per job."""
    all_rows = list_rate_card(db)
    seen: dict[int, dict] = {}
    for row in all_rows:
        # list_rate_card orders by date desc per job, so first seen = latest
        if row["job_id"] not in seen:
            seen[row["job_id"]] = row
    return list(seen.values())


def list_rate_history(db: Session, job_key: str) -> list[dict]:
    """Return all rate rows for a given job_key ordered by date desc."""
    rows = db.execute(
        select(RateCard, Job.job_key.label("job_key"), Job.label.label("job_label"))
        .join(Job, Job.id == RateCard.job_id)
        .where(Job.job_key == job_key)
        .order_by(RateCard.date.desc())
    ).all()
    return [
        {
            "id": row.RateCard.id,
            "job_id": row.RateCard.job_id,
            "job_key": row.job_key,
            "job_label": row.job_label,
            "date": row.RateCard.date,
            "cost": row.RateCard.cost,
        }
        for row in rows
    ]


def _badge_payload(badge_id: int, label: str | None, color: str | None) -> dict:
    return {
        "id": badge_id,
        "label": label or str(badge_id),
        "color": color,
    }


def _serialize_po(
    po: PO,
    project_label: str | None,
    status_label: str | None,
    status_color: str | None,
    invoice_status: dict | None = None,
    *,
    site_circuit_id: str | None = None,
    subproject_name: str | None = None,
    site_status_key: str | None = None,
) -> dict:
    return {
        "id": po.id,
        "project_id": po.project_id,
        "project_label": project_label,
        "project_name": project_label,
        "site_id": po.site_id,
        "subproject_id": po.subproject_id,
        "site_circuit_id": site_circuit_id,
        "subproject_name": subproject_name,
        "site_status_key": site_status_key,
        "entity_id": po.entity_id,
        "po_no": po.po_no,
        "po_date": po.po_date,
        "period_from": po.period_from,
        "period_to": po.period_to,
        "valid_from": po.valid_from,
        "valid_to": po.valid_to,
        "po_status_id": po.po_status_id,
        "po_status": _badge_payload(po.po_status_id, status_label, status_color),
        "invoice_status": invoice_status,
        "version": po.version,
    }

def _po_context_maps(db: Session, rows: list[tuple]) -> tuple[dict[tuple[int, int], str | None], dict[tuple[int, int], str | None]]:
    site_map: dict[tuple[int, int], str | None] = {}
    site_status_map: dict[tuple[int, int], str | None] = {}
    subproject_map: dict[tuple[int, int], str | None] = {}

    by_project: dict[int, dict[str, object]] = {}
    for row in rows:
        po = row.PO
        project = row.Project
        entry = by_project.setdefault(project.id, {"project": project, "site_ids": set(), "subproject_ids": set()})
        if po.site_id is not None:
            entry["site_ids"].add(po.site_id)
        if po.subproject_id is not None:
            entry["subproject_ids"].add(po.subproject_id)

    for project_id, entry in by_project.items():
        project = entry["project"]
        site_ids = list(entry["site_ids"])
        subproject_ids = set(entry["subproject_ids"])
        site_model = get_site_model(project.key)
        subproject_model = get_subproject_model(project.key)

        if site_ids:
            site_rows = db.execute(select(site_model).where(site_model.id.in_(site_ids))).scalars().all()
            for site in site_rows:
                site_map[(project_id, site.id)] = getattr(site, "ckt_id", None)
                status_badge = db.get(Badge, getattr(site, "status_id", None)) if getattr(site, "status_id", None) is not None else None
                site_status_map[(project_id, site.id)] = None if status_badge is None else status_badge.key
                if getattr(site, "subproject_id", None) is not None:
                    subproject_ids.add(site.subproject_id)

        if subproject_ids:
            subproject_rows = db.execute(select(subproject_model).where(subproject_model.id.in_(list(subproject_ids)))).scalars().all()
            for subproject in subproject_rows:
                subproject_map[(project_id, subproject.id)] = format_subproject_label(
                    subproject.batch_date,
                    getattr(subproject, "bucket", None),
                    subproject.id,
                )

    return site_map, subproject_map, site_status_map


def _serialize_invoice(invoice: Invoice, status_label: str | None, status_color: str | None) -> dict:
    return {
        "id": invoice.id,
        "po_id": invoice.po_id,
        "invoice_no": invoice.invoice_no,
        "invoice_date": invoice.invoice_date,
        "period_from": invoice.period_from,
        "period_to": invoice.period_to,
        "submission_date": invoice.submission_date,
        "settlement_date": invoice.settlement_date,
        "invoice_status_id": invoice.invoice_status_id,
        "invoice_status": _badge_payload(invoice.invoice_status_id, status_label, status_color),
        "amount": None,
        "version": invoice.version,
    }


def list_pos(db: Session) -> list[dict]:
    invoice_rows = db.execute(
        select(Invoice, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Badge, Badge.id == Invoice.invoice_status_id)
        .order_by(Invoice.id.desc())
    ).all()
    latest_invoice_status_by_po: dict[int, dict] = {}
    for row in invoice_rows:
        latest_invoice_status_by_po.setdefault(
            row.Invoice.po_id,
            _badge_payload(row.Invoice.invoice_status_id, row.status_label, row.status_color),
        )

    rows = db.execute(
        select(PO, Project, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Project, Project.id == PO.project_id)
        .join(Badge, Badge.id == PO.po_status_id)
        .order_by(PO.id.desc())
    ).all()
    site_map, subproject_map, site_status_map = _po_context_maps(db, rows)
    return [
        _serialize_po(
            row.PO,
            row.Project.label,
            row.status_label,
            row.status_color,
            latest_invoice_status_by_po.get(row.PO.id),
            site_circuit_id=site_map.get((row.PO.project_id, row.PO.site_id)) if row.PO.site_id is not None else None,
            subproject_name=subproject_map.get((row.PO.project_id, row.PO.subproject_id)) if row.PO.subproject_id is not None else None,
            site_status_key=site_status_map.get((row.PO.project_id, row.PO.site_id)) if row.PO.site_id is not None else None,
        )
        for row in rows
    ]


def get_po(db: Session, po_id: int) -> dict | None:
    row = db.execute(
        select(PO, Project, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Project, Project.id == PO.project_id)
        .join(Badge, Badge.id == PO.po_status_id)
        .where(PO.id == po_id)
    ).one_or_none()
    if row is None:
        return None
    site_map, subproject_map, site_status_map = _po_context_maps(db, [row])
    return _serialize_po(
        row.PO,
        row.Project.label,
        row.status_label,
        row.status_color,
        site_circuit_id=site_map.get((row.PO.project_id, row.PO.site_id)) if row.PO.site_id is not None else None,
        subproject_name=subproject_map.get((row.PO.project_id, row.PO.subproject_id)) if row.PO.subproject_id is not None else None,
        site_status_key=site_status_map.get((row.PO.project_id, row.PO.site_id)) if row.PO.site_id is not None else None,
    )


def create_po(db: Session, payload: POCreate) -> PO:
    row = PO(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_invoices(db: Session, po_id: int | None = None) -> list[dict]:
    stmt = (
        select(Invoice, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Badge, Badge.id == Invoice.invoice_status_id)
        .order_by(Invoice.id.desc())
    )
    if po_id is not None:
        stmt = stmt.where(Invoice.po_id == po_id)
    rows = db.execute(stmt).all()
    return [
        _serialize_invoice(row.Invoice, row.status_label, row.status_color)
        for row in rows
    ]


def create_invoice(db: Session, payload: InvoiceCreate) -> Invoice:
    row = Invoice(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_po_status(db: Session, po_id: int, status_id: int) -> PO:
    row = db.get(PO, po_id)
    row.po_status_id = status_id
    db.commit()
    db.refresh(row)
    return row


def _badge_id_by_key(db: Session, badge_type: str, key: str) -> int | None:
    row = db.execute(
        select(Badge).where(Badge.type == badge_type, Badge.key == key)
    ).scalar_one_or_none()
    return row.id if row else None


def update_po(db: Session, po_id: int, data: dict) -> dict | None:
    row = db.get(PO, po_id)
    if row is None:
        return None
    is_bb_po = row.project_id == acc_rules._bb_project_id(db)
    if "po_no" in data:
        row.po_no = data["po_no"]
    if "po_date" in data:
        row.po_date = data["po_date"]
    if "valid_from" in data:
        row.valid_from = data["valid_from"]
    if "valid_to" in data:
        row.valid_to = data["valid_to"]
    _ensure_not_future(row.po_date, "PO Date")
    if is_bb_po:
        if any(key in data for key in ("po_no", "po_date", "valid_from", "valid_to")):
            if not row.po_no or row.po_date is None or row.valid_from is None or row.valid_to is None:
                raise HTTPException(status_code=400, detail="PO Number, PO Date, Valid From, and Valid To are all required.")
            if row.valid_from > row.valid_to:
                raise HTTPException(status_code=400, detail="Valid From cannot be later than Valid To.")
            acc_rules.sync_bb_po_activation(db, row)
    # Auto-advance: Pending → Received when PO number is entered
    if row.po_no and not is_bb_po and row.po_status_id == _badge_id_by_key(db, "doc_status", "pend"):
        rec_id = _badge_id_by_key(db, "doc_status", "rec")
        if rec_id is not None:
            row.po_status_id = rec_id
    db.commit()
    return get_po(db, po_id)


def update_invoice(db: Session, invoice_id: int, data: dict) -> dict | None:
    row = db.get(Invoice, invoice_id)
    if row is None:
        return None
    po = db.get(PO, row.po_id)
    is_bb_invoice = po is not None and po.project_id == acc_rules._bb_project_id(db)
    if "invoice_no" in data:
        row.invoice_no = data["invoice_no"] or None
    if "invoice_date" in data:
        row.invoice_date = data["invoice_date"] or None
    if "period_from" in data:
        row.period_from = data["period_from"] or None
    if "period_to" in data:
        row.period_to = data["period_to"] or None
    if "submission_date" in data:
        row.submission_date = data["submission_date"] or None
    if "settlement_date" in data:
        row.settlement_date = data["settlement_date"] or None
    _ensure_not_future(row.invoice_date, "Invoice Date")
    _ensure_not_future(row.submission_date, "Submission Date")
    _ensure_not_future(row.settlement_date, "Settlement Date")
    if is_bb_invoice:
        if not po or po.valid_from is None or po.valid_to is None:
            raise HTTPException(status_code=400, detail="PO validity must be set before editing BB invoices.")
        if not row.invoice_no or row.invoice_date is None or row.period_from is None or row.period_to is None:
            raise HTTPException(status_code=400, detail="Invoice Number, Invoice Date, Period From, and Period To are all required.")
        if row.period_from > row.period_to:
            raise HTTPException(status_code=400, detail="Period From cannot be later than Period To.")
        if row.period_to > po.valid_to:
            raise HTTPException(status_code=400, detail="Invoice Period To cannot be later than PO Valid To.")
        previous = db.execute(
            select(Invoice)
            .where(Invoice.po_id == row.po_id, Invoice.id != row.id)
            .order_by(Invoice.period_to.desc().nullslast(), Invoice.id.desc())
        ).scalars().all()
        previous_completed = [invoice for invoice in previous if invoice.period_to is not None]
        if previous_completed:
            latest_previous = previous_completed[0]
            expected_period_from = latest_previous.period_to + timedelta(days=1)
            if row.period_from != expected_period_from:
                raise HTTPException(status_code=400, detail=f"Invoice Period From must be {expected_period_from.isoformat()}.")
        elif row.period_from != po.valid_from:
            raise HTTPException(status_code=400, detail=f"First invoice Period From must be {po.valid_from.isoformat()}.")
    # Auto-advance: Pending → Generated when invoice_no AND invoice_date are both set
    if row.invoice_no and row.invoice_date and (not is_bb_invoice or row.period_from is not None and row.period_to is not None) and row.invoice_status_id == _badge_id_by_key(db, "doc_status", "pend"):
        gen_id = _badge_id_by_key(db, "doc_status", "gen")
        if gen_id is not None:
            row.invoice_status_id = gen_id
    row.version = (row.version or 0) + 1
    db.commit()
    result = db.execute(
        select(Invoice, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Badge, Badge.id == Invoice.invoice_status_id)
        .where(Invoice.id == invoice_id)
    ).one()
    return _serialize_invoice(result.Invoice, result.status_label, result.status_color)


def update_invoice_status(db: Session, invoice_id: int, status_id: int) -> Invoice:
    row = db.get(Invoice, invoice_id)
    row.invoice_status_id = status_id
    db.commit()
    db.refresh(row)
    return row


def reject_invoice(db: Session, invoice_id: int) -> dict | None:
    row = db.get(Invoice, invoice_id)
    if row is None:
        return None
    rej_id = _badge_id_by_key(db, "doc_status", "rej")
    if rej_id is None:
        return None
    row.invoice_status_id = rej_id
    row.invoice_date = None
    row.submission_date = None
    row.version = (row.version or 0) + 1
    db.commit()
    result = db.execute(
        select(Invoice, Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Badge, Badge.id == Invoice.invoice_status_id)
        .where(Invoice.id == invoice_id)
    ).one()
    return _serialize_invoice(result.Invoice, result.status_label, result.status_color)


def list_po_updates(db: Session, po_id: int) -> list[dict]:
    # po_id column removed; return project-level acc updates for this PO's project
    po = db.get(PO, po_id)
    if po is None:
        return []
    rows = db.execute(
        select(Update)
        .where(Update.project_id == po.project_id, Update.dept_id == _ACC_DEPT_ID)
        .order_by(Update.date.desc())
    ).scalars().all()
    return [
        {
            "id": r.id,
            "date": r.date,
            "update": r.update,
            "followup_date": r.followup_date,
        }
        for r in rows
    ]


def create_po_update(db: Session, po_id: int, data: dict) -> dict:
    row = Update(
        project_id=data["project_id"],
        date=data["date"],
        update=data["update"],
        followup_date=data.get("followup_date"),
        dept_id=_ACC_DEPT_ID,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "date": row.date, "update": row.update, "followup_date": row.followup_date}
