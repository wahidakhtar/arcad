from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.core.ws_manager import manager as ws_manager
from app.schemas.billing import ActivatePORequest, InvoiceCreate, POCreate, RateCardCreate, StatusUpdate
from app.services import billing as billing_service
from app.services import acc_rules

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/jobs", dependencies=[Depends(permission_required("billing", "read"))])
def list_jobs(db: Session = Depends(get_db)):
    return billing_service.list_jobs(db)


@router.get("/rate-card", dependencies=[Depends(permission_required("rate", "read"))])
def list_rate_card(db: Session = Depends(get_db)):
    return billing_service.list_rate_card(db)


@router.post("/rate-card", dependencies=[Depends(permission_required("rate", "write"))])
def create_rate_card(payload: RateCardCreate, db: Session = Depends(get_db)):
    return billing_service.create_rate_card(db, payload)


@router.get("/pos", dependencies=[Depends(permission_required("billing", "read"))])
def list_pos(db: Session = Depends(get_db)):
    return billing_service.list_pos(db)


@router.get("/po/{po_id}", dependencies=[Depends(permission_required("billing", "read"))])
def get_po(po_id: int, db: Session = Depends(get_db)):
    po = billing_service.get_po(db, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="PO not found")
    return po


@router.post("/pos", dependencies=[Depends(permission_required("billing", "write"))])
async def create_po(payload: POCreate, db: Session = Depends(get_db)):
    result = billing_service.create_po(db, payload)
    await ws_manager.broadcast({"type": "PO_CREATED"})
    return result


@router.patch("/pos/{po_id}/status", dependencies=[Depends(permission_required("billing", "write"))])
async def update_po_status(po_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    result = billing_service.update_po_status(db, po_id, payload.status_id)
    await ws_manager.broadcast({"type": "PO_UPDATED", "po_id": po_id})
    return result


@router.patch("/pos/{po_id}/activate", dependencies=[Depends(permission_required("billing", "write"))])
async def activate_po(po_id: int, payload: ActivatePORequest, db: Session = Depends(get_db)):
    po = acc_rules.activate_bb_po(db, po_id, payload.valid_from, payload.valid_to)
    db.commit()
    await ws_manager.broadcast({"type": "PO_UPDATED", "po_id": po_id})
    return {"id": po.id, "valid_from": po.valid_from, "valid_to": po.valid_to, "po_status_id": po.po_status_id}


@router.get("/invoices", dependencies=[Depends(permission_required("billing", "read"))])
def list_invoices(po_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    return billing_service.list_invoices(db, po_id=po_id)


@router.post("/invoices", dependencies=[Depends(permission_required("billing", "write"))])
async def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    result = billing_service.create_invoice(db, payload)
    po_id = result.get("po_id") if isinstance(result, dict) else getattr(result, "po_id", None)
    await ws_manager.broadcast({"type": "INVOICE_CREATED", "po_id": po_id})
    return result


@router.patch("/invoices/{invoice_id}/status", dependencies=[Depends(permission_required("billing", "write"))])
async def update_invoice_status(invoice_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    result = billing_service.update_invoice_status(db, invoice_id, payload.status_id)
    po_id = result.get("po_id") if isinstance(result, dict) else getattr(result, "po_id", None)
    await ws_manager.broadcast({"type": "INVOICE_UPDATED", "po_id": po_id})
    return result


@router.get("/po/{po_id}/updates", dependencies=[Depends(permission_required("acc_update", "read"))])
def list_po_updates(po_id: int, db: Session = Depends(get_db)):
    return billing_service.list_po_updates(db, po_id)


@router.post("/po/{po_id}/updates", dependencies=[Depends(permission_required("acc_update", "write"))])
def create_po_update(po_id: int, payload: dict, db: Session = Depends(get_db)):
    po = billing_service.get_po(db, po_id)
    if po is None:
        raise HTTPException(status_code=404, detail="PO not found")
    data = {**payload, "project_id": po["project_id"]}
    return billing_service.create_po_update(db, po_id, data)
