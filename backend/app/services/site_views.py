from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.calculator import RateCardRow, SubconAssignmentRow, TransactionRow, calculate_site_financials
from app.models.acc import RateCard, Transaction
from app.models.core import Job, JobBucket
from app.models.ops import Subcon, SubconAssignment
from app.services.common import badge_map, get_project, get_site_model, model_to_dict


def build_site_financials(db: Session, project_id: int, project_key: str, site_id: int, site_data: dict[str, Any]) -> dict[str, Any]:
    badges = badge_map(db)
    assignments = [
        SubconAssignmentRow(
            id=row.id,
            subcon_id=row.subcon_id,
            bucket_key=db.get(JobBucket, row.bucket_id).key,
            active=row.active,
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
    return calculate_site_financials(site_data, assignments, transactions, rates, job_scales)


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
    project = get_project(db, project_key)
    model = get_site_model(project_key)
    site = db.get(model, site_id)
    if site is None:
        return None
    site_data = model_to_dict(site)
    financials = build_site_financials(db, project.id, project_key, site_id, site_data)
    badges = badge_map(db)
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
