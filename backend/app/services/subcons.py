from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission
from app.models.acc import Transaction
from app.models.core import Project
from app.models.ops import Subcon, SubconAssignment, SubconProject, SubconType
from app.services.common import badge_map, format_subproject_label, get_recipient_type_id, get_site_model, get_subproject_model
from app.services.site_views import get_site_projection
from app.schemas.subcon import SubconCreate


def _serialize_projects(db: Session, subcon_id: int) -> list[dict]:
    rows = db.execute(
        select(Project)
        .join(SubconProject, SubconProject.project_id == Project.id)
        .where(SubconProject.subcon_id == subcon_id)
        .order_by(Project.label.asc())
    ).scalars().all()
    return [{"id": row.id, "key": row.key, "label": row.label} for row in rows]


def _serialize_subcon(db: Session, subcon: Subcon) -> dict:
    subcon_type = db.get(SubconType, subcon.subcon_type_id)
    return {
        "id": subcon.id,
        "name": subcon.name,
        "subcon_type_id": subcon.subcon_type_id,
        "subcon_type_key": "" if subcon_type is None else subcon_type.key,
        "subcon_type_label": "Unknown" if subcon_type is None else subcon_type.label,
        "is_active": subcon.is_active,
        "created_at": subcon.created_at,
        "projects": _serialize_projects(db, subcon.id),
    }


def _serialize_subcon_summary(db: Session, subcon: Subcon) -> dict:
    subcon_type = db.get(SubconType, subcon.subcon_type_id)
    return {
        "id": subcon.id,
        "name": subcon.name,
        "subcon_type_id": subcon.subcon_type_id,
        "subcon_type_key": "" if subcon_type is None else subcon_type.key,
        "subcon_type_label": "Unknown" if subcon_type is None else subcon_type.label,
        "is_active": subcon.is_active,
        "created_at": subcon.created_at,
    }


def _serialize_assigned_sites(db: Session, subcon_id: int) -> list[dict]:
    assignments = db.execute(
        select(SubconAssignment).where(
            SubconAssignment.subcon_id == subcon_id,
            SubconAssignment.active.is_(True),
        )
    ).scalars().all()
    if not assignments:
        return []

    badges = badge_map(db)
    projects = {
        project.id: project
        for project in db.execute(
            select(Project).where(Project.id.in_([assignment.project_id for assignment in assignments]))
        ).scalars().all()
    }

    rows: list[dict] = []
    for assignment in assignments:
        project = projects.get(assignment.project_id)
        if project is None:
            continue
        model = get_site_model(project.key)
        site = db.get(model, assignment.site_id)
        if site is None:
            continue
        projection = get_site_projection(db, project.key, site.id)
        if projection is None:
            continue
        match = next((row for row in projection.get("subcon_rows", []) if int(row["subcon_id"]) == subcon_id and bool(row["active"])), None)
        rows.append(
            {
                "project_name": project.label,
                "circuit_id": projection["ckt_id"],
                "status": badges.get(site.status_id).label if badges.get(site.status_id) is not None else str(site.status_id),
                "cost": Decimal("0.00") if match is None else match["cost"],
                "paid": Decimal("0.00") if match is None else match["paid"],
                "balance": Decimal("0.00") if match is None else match["balance"],
            }
        )

    return sorted(rows, key=lambda row: (row["project_name"], row["circuit_id"] or ""))


def _serialize_transactions(db: Session, subcon_id: int) -> list[dict]:
    subcon_recipient_type_id = get_recipient_type_id(db, "subcon")
    transactions = db.execute(
        select(Transaction).where(
            Transaction.recipient_type_id == subcon_recipient_type_id,
            Transaction.recipient_id == subcon_id,
        ).order_by(Transaction.request_date.desc(), Transaction.id.desc())
    ).scalars().all()
    if not transactions:
        return []

    badges = badge_map(db)
    projects = {
        project.id: project
        for project in db.execute(
            select(Project).where(Project.id.in_([transaction.project_id for transaction in transactions]))
        ).scalars().all()
    }

    site_maps: dict[str, dict[int, object]] = {}
    subproject_maps: dict[str, dict[int, object]] = {}
    for project in projects.values():
        model = get_site_model(project.key)
        subproject_model = get_subproject_model(project.key)
        site_ids = {transaction.site_id for transaction in transactions if transaction.project_id == project.id and transaction.site_id is not None}
        subproject_ids: set[int] = set()
        if site_ids:
            site_rows = db.execute(select(model).where(model.id.in_(site_ids))).scalars().all()
            site_maps[project.key] = {site.id: site for site in site_rows}
            subproject_ids = {site.subproject_id for site in site_rows if getattr(site, "subproject_id", None) is not None}
        else:
            site_maps[project.key] = {}
        subproject_maps[project.key] = {
            subproject.id: subproject
            for subproject in db.execute(select(subproject_model).where(subproject_model.id.in_(subproject_ids))).scalars().all()
        } if subproject_ids else {}

    rows: list[dict] = []
    for transaction in transactions:
        project = projects.get(transaction.project_id)
        if project is None:
            continue
        site = site_maps.get(project.key, {}).get(transaction.site_id) if transaction.site_id is not None else None
        subproject = None
        if site is not None:
            subproject = subproject_maps.get(project.key, {}).get(site.subproject_id)
        project_or_subproject = project.label
        if subproject is not None:
            project_or_subproject = f"{project.label} / {format_subproject_label(subproject.batch_date, subproject.bucket, subproject.id)}"
        badge = badges.get(transaction.status_id)
        rows.append(
            {
                "po_number": getattr(site, "po_number", None),
                "invoice_number": getattr(site, "invoice_number", None),
                "amount": transaction.amount,
                "status": badge.label if badge is not None else str(transaction.status_id),
                "project_or_subproject": project_or_subproject,
            }
        )
    return rows


def _serialize_subcon_detail(db: Session, subcon: Subcon) -> dict:
    return {
        "subcon": _serialize_subcon_summary(db, subcon),
        "assigned_projects": _serialize_projects(db, subcon.id),
        "assigned_sites": _serialize_assigned_sites(db, subcon.id),
        "transactions": _serialize_transactions(db, subcon.id),
    }


def get_subcon(db: Session, user: UserContext, subcon_id: int) -> dict:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    return _serialize_subcon_detail(db, subcon)


def list_subcons(db: Session, user: UserContext) -> list[dict]:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    rows = db.execute(select(Subcon).order_by(Subcon.name.asc(), Subcon.id.asc())).scalars().all()
    return [_serialize_subcon(db, row) for row in rows]


def create_subcon(db: Session, user: UserContext, payload: SubconCreate) -> dict:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Subcon name is required")
    subcon_type = db.get(SubconType, payload.subcon_type_id)
    if subcon_type is None:
        raise HTTPException(status_code=400, detail="Invalid subcon type")

    row = Subcon(
        name=name,
        subcon_type_id=payload.subcon_type_id,
        is_active=payload.is_active,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_subcon(db, row)


def assign_subcon_project(db: Session, user: UserContext, subcon_id: int, project_id: int) -> dict:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    row = SubconProject(subcon_id=subcon_id, project_id=project_id)
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Subcon already assigned to this project") from exc
    return _serialize_subcon(db, subcon)


def remove_subcon_project(db: Session, user: UserContext, subcon_id: int, project_id: int) -> dict:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    row = db.execute(
        select(SubconProject).where(
            SubconProject.subcon_id == subcon_id,
            SubconProject.project_id == project_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Assigned project not found")
    db.delete(row)
    db.commit()
    return _serialize_subcon_detail(db, subcon)


def list_subcon_projects(db: Session, user: UserContext, subcon_id: int) -> list[dict]:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    return _serialize_projects(db, subcon_id)
