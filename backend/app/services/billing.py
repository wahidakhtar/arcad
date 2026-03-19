from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO, RateCard
from app.models.core import Job
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


def list_pos(db: Session) -> list[PO]:
    return db.execute(select(PO).order_by(PO.id.desc())).scalars().all()


def create_po(db: Session, payload: POCreate) -> PO:
    row = PO(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_invoices(db: Session) -> list[Invoice]:
    return db.execute(select(Invoice).order_by(Invoice.id.desc())).scalars().all()


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
