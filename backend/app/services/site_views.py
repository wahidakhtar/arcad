from __future__ import annotations

from typing import Any
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.calculator import RateCardRow, SubconAssignmentRow, TransactionRow, calculate_site_financials
from app.models.acc import RateCard, Transaction
from app.models.core import Job, JobBucket
from app.models.md import MDOutcome
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


def _bb_provider_rows(db: Session, project_id: int, site_id: int) -> list[dict[str, Any]]:
    badges = badge_map(db)
    assignments = db.execute(
        select(SubconAssignment)
        .where(SubconAssignment.project_id == project_id, SubconAssignment.site_id == site_id)
        .order_by(SubconAssignment.assigned_at.asc(), SubconAssignment.id.asc())
    ).scalars().all()
    if not assignments:
        return []

    subcons = {
        subcon.id: subcon.name
        for subcon in db.execute(
            select(Subcon).where(Subcon.id.in_([assignment.subcon_id for assignment in assignments]))
        ).scalars().all()
    }
    transactions = db.execute(
        select(Transaction).where(Transaction.project_id == project_id, Transaction.site_id == site_id)
    ).scalars().all()

    rows: list[dict[str, Any]] = []
    for assignment in assignments:
        paid = Decimal("0")
        for tx in transactions:
            if tx.recipient_id != assignment.subcon_id:
                continue
            tx_type = badges.get(tx.type_id)
            tx_status = badges.get(tx.status_id)
            if tx_type is None or tx_status is None or tx_status.key != "exct":
                continue
            if tx_type.key == "fe_pay":
                paid += tx.amount
            elif tx_type.key == "ref":
                paid -= tx.amount
        rows.append(
            {
                "assignment_id": assignment.id,
                "subcon_id": assignment.subcon_id,
                "subcon_label": subcons.get(assignment.subcon_id, f"Subcon {assignment.subcon_id}"),
                "bucket_key": "provider",
                "active": assignment.active,
                "cost": Decimal("0"),
                "paid": paid,
                "balance": None,
            }
        )
    return rows


def strip_billing_fields(site_data: dict[str, Any]) -> dict[str, Any]:
    for key in (
        "po_id",
        "po_number",
        "po_date",
        "po_valid_from",
        "po_valid_to",
        "po_status_id",
        "invoice_id",
        "invoice_number",
        "invoice_date",
        "invoice_period_from",
        "invoice_period_to",
        "invoice_submission_date",
        "invoice_settlement_date",
        "invoice_status_id",
        "active_po_number",
        "active_invoice_number",
        "active_invoice_status",
        "next_invoice_date",
    ):
        site_data.pop(key, None)
    return site_data


def get_site_projection(db: Session, project_key: str, site_id: int, *, include_billing: bool = True) -> dict[str, Any] | None:
    from app.models.acc import Invoice, PO
    project = get_project(db, project_key)
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        return None
    site_data = model_to_dict(site)
    if project_key == "md":
        site_data["outcome_label"] = None
        outcome_id = site_data.get("outcome_id")
        if outcome_id is not None:
            outcome = db.get(MDOutcome, int(outcome_id))
            site_data["outcome_label"] = outcome.label if outcome is not None else None
    financials = build_site_financials(db, project.id, project_key, site_id, site_data)
    badges = badge_map(db)

    if include_billing:
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
            site_data["po_valid_from"] = str(po.valid_from) if po.valid_from else None
            site_data["po_valid_to"] = str(po.valid_to) if po.valid_to else None
            site_data["po_status_id"] = po.po_status_id
            site_data["invoice_id"] = inv.id if inv else None
            site_data["invoice_number"] = inv.invoice_no if inv else None
            site_data["invoice_date"] = str(inv.invoice_date) if inv and inv.invoice_date else None
            site_data["invoice_period_from"] = str(inv.period_from) if inv and inv.period_from else None
            site_data["invoice_period_to"] = str(inv.period_to) if inv and inv.period_to else None
            site_data["invoice_submission_date"] = str(inv.submission_date) if inv and inv.submission_date else None
            site_data["invoice_settlement_date"] = str(inv.settlement_date) if inv and inv.settlement_date else None
            site_data["invoice_status_id"] = inv.invoice_status_id if inv else None
        else:
            site_data["po_id"] = None
            site_data["po_number"] = None
            site_data["po_date"] = None
            site_data["po_valid_from"] = None
            site_data["po_valid_to"] = None
            site_data["po_status_id"] = None
            site_data["invoice_id"] = None
            site_data["invoice_number"] = None
            site_data["invoice_date"] = None
            site_data["invoice_period_from"] = None
            site_data["invoice_period_to"] = None
            site_data["invoice_submission_date"] = None
            site_data["invoice_settlement_date"] = None
            site_data["invoice_status_id"] = None
    else:
        strip_billing_fields(site_data)

    if project_key == "bb" and include_billing:
        from app.models.bb import Recharge

        active_po = db.execute(
            select(PO).where(PO.project_id == project.id, PO.site_id == site_id).order_by(PO.valid_to.desc().nullslast(), PO.id.desc())
        ).scalars().first()
        active_invoice = None
        if active_po is not None:
            active_invoice = db.execute(
                select(Invoice).where(Invoice.po_id == active_po.id).order_by(Invoice.period_to.desc().nullslast(), Invoice.id.desc())
            ).scalars().first()
        last_recharge = db.execute(
            select(Recharge).where(Recharge.site_id == site_id).order_by(Recharge.date.desc(), Recharge.id.desc())
        ).scalars().first()
        next_invoice_date = None
        if active_invoice is not None and active_invoice.period_to is not None and active_po is not None and active_po.valid_to and active_invoice.period_to < active_po.valid_to:
            next_invoice_date = active_invoice.period_to + timedelta(days=1)
        elif active_po is not None and active_invoice is None and active_po.valid_from is not None:
            next_invoice_date = active_po.valid_from

        site_data["active_po_number"] = active_po.po_no if active_po else None
        site_data["active_invoice_number"] = active_invoice.invoice_no if active_invoice else None
        site_data["active_invoice_status"] = active_invoice.invoice_status_id if active_invoice else None
        site_data["last_recharge_date"] = str(last_recharge.date) if last_recharge else None
        site_data["next_recharge_date"] = str(last_recharge.next_recharge_date) if last_recharge and last_recharge.next_recharge_date else None
        site_data["next_invoice_date"] = str(next_invoice_date) if next_invoice_date else None

    subcon_rows = serialize_subcon_rows(db, financials.get("subcon_rows", []))
    if project_key == "bb":
        subcon_rows = _bb_provider_rows(db, project.id, site_id)

    return {
        "id": site.id,
        "project_id": project.id,
        "project_key": project_key,
        "subproject_id": site.subproject_id,
        "ckt_id": site.ckt_id,
        "status_key": badges[site.status_id].key,
        "receiving_date": site.receiving_date,
        "fields": site_data,
        "financials": {key: financials[key] for key in ["budget", "cost", "paid", "balance"]},
        "subcon_rows": subcon_rows,
    }
