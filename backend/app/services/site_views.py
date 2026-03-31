from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.calculator import RateCardRow, SubconAssignmentRow, TransactionRow, calculate_site_financials
from app.models.acc import RateCard, Transaction
from app.models.core import Job, JobBucket
from app.models.ops import Subcon, SubconAssignment
from app.services.common import badge_map, get_project, get_project_config, get_site_model, model_to_dict


def build_site_financials(db: Session, project_id: int, project_key: str, site_id: int, site_data: dict[str, Any]) -> dict[str, Any]:
    badges = badge_map(db)
    assignments = [
        SubconAssignmentRow(
            id=row.id,
            subcon_id=row.subcon_id,
            bucket_key=db.get(JobBucket, row.bucket_id).key,
            active=row.active,
            removed_cost=row.removed_cost,
        )
        for row in db.execute(
            select(SubconAssignment).where(SubconAssignment.project_id == project_id, SubconAssignment.site_id == site_id)
        ).scalars()
        if row.bucket_id is not None
    ]
    transactions = [
        TransactionRow(
            recipient_id=row.recipient_id,
            type_key=badges[row.type_id].key,
            amount=row.amount,
            status_key=badges[row.status_id].key,
        )
        for row in db.execute(select(Transaction).where(Transaction.project_id == project_id, Transaction.site_id == site_id)).scalars()
    ]
    rate_rows = db.execute(select(RateCard, Job.job_key.label("jk")).join(Job, Job.id == RateCard.job_id)).all()
    rates = [RateCardRow(job_key=row.jk, effective_date=row.RateCard.date, cost=row.RateCard.cost) for row in rate_rows]
    job_scales = {job.job_key: job.scale_by for job in db.execute(select(Job)).scalars()}
    site_data["status_key"] = badges[site_data["status_id"]].key
    project_config = get_project_config(project_key)
    budget_params = getattr(project_config, "budget_params", {}) or {}
    site_bucket_keys = [
        value
        for key, value in budget_params.items()
        if isinstance(value, str) and "bucket" in key
    ]
    return calculate_site_financials(site_data, assignments, transactions, rates, job_scales, site_bucket_keys)


def serialize_subcon_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
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


def get_site_projection(db: Session, project_key: str, site_id: int) -> dict[str, Any] | None:
    from app.models.acc import Invoice, PO
    project = get_project(db, project_key)
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        return None
    site_data = model_to_dict(site)
    financials = build_site_financials(db, project.id, project_key, site_id, site_data)
    badges = badge_map(db)

    # Inject billing fields directly from source of truth (schema_acc)
    po = db.execute(
        select(PO).where(PO.project_id == project.id, PO.site_id == site_id).order_by(PO.id.desc())
    ).scalars().first()
    if po:
        inv = db.execute(
            select(Invoice).where(Invoice.po_id == po.id).order_by(Invoice.id.desc())
        ).scalars().first()
        site_data["po_id"] = po.id
        site_data["po_number"] = po.po_no
        site_data["po_date"] = str(po.po_date) if po.po_date else None
        site_data["po_status_id"] = po.po_status_id
        site_data["invoice_id"] = inv.id if inv else None
        site_data["invoice_number"] = inv.invoice_no if inv else None
        site_data["invoice_date"] = str(inv.invoice_date) if inv and inv.invoice_date else None
        site_data["invoice_submission_date"] = str(inv.submission_date) if inv and inv.submission_date else None
        site_data["invoice_settlement_date"] = str(inv.settlement_date) if inv and inv.settlement_date else None
        site_data["invoice_status_id"] = inv.invoice_status_id if inv else None
    else:
        site_data["po_id"] = None
        site_data["po_number"] = None
        site_data["po_date"] = None
        site_data["po_status_id"] = None
        site_data["invoice_id"] = None
        site_data["invoice_number"] = None
        site_data["invoice_date"] = None
        site_data["invoice_submission_date"] = None
        site_data["invoice_settlement_date"] = None
        site_data["invoice_status_id"] = None

    return {
        "id": site.id,
        "project_key": project_key,
        "subproject_id": site.subproject_id,
        "ckt_id": site.ckt_id,
        "status_key": badges[site.status_id].key,
        "receiving_date": site.receiving_date,
        "fields": site_data,
        "financials": {key: financials[key] for key in ["budget", "cost", "paid", "balance"]},
        "subcon_rows": serialize_subcon_rows(db, financials.get("subcon_rows", [])),
    }
