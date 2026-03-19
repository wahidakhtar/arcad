from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO, RateCard
from app.schemas.billing import InvoiceCreate, POCreate


def list_rate_card(db: Session) -> list[RateCard]:
    return db.execute(select(RateCard).order_by(RateCard.job_id.asc(), RateCard.date.desc())).scalars().all()


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
