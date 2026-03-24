from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO, RateCard
from app.models.core import Badge, Job, Project
from app.schemas.billing import InvoiceCreate, POCreate, RateCardCreate


def list_jobs(db: Session) -> list[Job]:
    return db.execute(select(Job).order_by(Job.id)).scalars().all()


def create_rate_card(db: Session, payload: RateCardCreate) -> dict:
    job = db.get(Job, payload.job_id)
    if job is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Job not found")
    row = RateCard(job_id=payload.job_id, job_key=job.job_key, date=payload.date, cost=payload.cost)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "job_id": row.job_id,
        "job_key": row.job_key,
        "job_label": job.label,
        "date": row.date,
        "cost": row.cost,
    }


def list_rate_card(db: Session) -> list[dict]:
    rows = db.execute(
        select(RateCard, Job.label.label("job_label"))
        .join(Job, Job.id == RateCard.job_id)
        .order_by(RateCard.job_id.asc(), RateCard.date.desc())
    ).all()
    return [
        {
            "id": row.RateCard.id,
            "job_id": row.RateCard.job_id,
            "job_key": row.RateCard.job_key,
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
) -> dict:
    return {
        "id": po.id,
        "project_id": po.project_id,
        "project_label": project_label,
        "site_id": po.site_id,
        "subproject_id": po.subproject_id,
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


def _serialize_invoice(invoice: Invoice, status_label: str | None, status_color: str | None) -> dict:
    return {
        "id": invoice.id,
        "po_id": invoice.po_id,
        "invoice_no": invoice.invoice_no,
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
        select(PO, Project.label.label("project_label"), Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Project, Project.id == PO.project_id)
        .join(Badge, Badge.id == PO.po_status_id)
        .order_by(PO.id.desc())
    ).all()
    return [
        _serialize_po(
            row.PO,
            row.project_label,
            row.status_label,
            row.status_color,
            latest_invoice_status_by_po.get(row.PO.id),
        )
        for row in rows
    ]


def get_po(db: Session, po_id: int) -> dict | None:
    row = db.execute(
        select(PO, Project.label.label("project_label"), Badge.label.label("status_label"), Badge.color.label("status_color"))
        .join(Project, Project.id == PO.project_id)
        .join(Badge, Badge.id == PO.po_status_id)
        .where(PO.id == po_id)
    ).one_or_none()
    if row is None:
        return None
    return _serialize_po(row.PO, row.project_label, row.status_label, row.status_color)


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


def update_invoice_status(db: Session, invoice_id: int, status_id: int) -> Invoice:
    row = db.get(Invoice, invoice_id)
    row.invoice_status_id = status_id
    db.commit()
    db.refresh(row)
    return row
