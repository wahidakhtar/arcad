from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.schemas.billing import InvoiceCreate, POCreate, RateCardCreate, StatusUpdate
from app.services import billing as billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/jobs", dependencies=[Depends(permission_required("billing", "read"))])
def list_jobs(db: Session = Depends(get_db)):
    return billing_service.list_jobs(db)


@router.get("/rate-card", dependencies=[Depends(permission_required("billing", "read"))])
def list_rate_card(db: Session = Depends(get_db)):
    return billing_service.list_rate_card(db)


@router.post("/rate-card", dependencies=[Depends(permission_required("rate", "write"))])
def create_rate_card(payload: RateCardCreate, db: Session = Depends(get_db)):
    return billing_service.create_rate_card(db, payload)


@router.get("/pos", dependencies=[Depends(permission_required("billing", "read"))])
def list_pos(db: Session = Depends(get_db)):
    return billing_service.list_pos(db)


@router.post("/pos", dependencies=[Depends(permission_required("billing", "write"))])
def create_po(payload: POCreate, db: Session = Depends(get_db)):
    return billing_service.create_po(db, payload)


@router.patch("/pos/{po_id}/status", dependencies=[Depends(permission_required("billing", "write"))])
def update_po_status(po_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    return billing_service.update_po_status(db, po_id, payload.status_id)


@router.get("/invoices", dependencies=[Depends(permission_required("billing", "read"))])
def list_invoices(db: Session = Depends(get_db)):
    return billing_service.list_invoices(db)


@router.post("/invoices", dependencies=[Depends(permission_required("billing", "write"))])
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    return billing_service.create_invoice(db, payload)


@router.patch("/invoices/{invoice_id}/status", dependencies=[Depends(permission_required("billing", "write"))])
def update_invoice_status(invoice_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    return billing_service.update_invoice_status(db, invoice_id, payload.status_id)
