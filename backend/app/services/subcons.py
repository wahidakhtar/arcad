from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import UserContext, ensure_permission
from app.models.core import Project
from app.models.ops import Subcon, SubconProject, SubconType
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


def get_subcon(db: Session, user: UserContext, subcon_id: int) -> dict:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    return _serialize_subcon(db, subcon)


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


def list_subcon_projects(db: Session, user: UserContext, subcon_id: int) -> list[dict]:
    ensure_permission(user, db, project_key=None, tag="subproject", action="write")
    subcon = db.get(Subcon, subcon_id)
    if subcon is None:
        raise HTTPException(status_code=404, detail="Subcon not found")
    return _serialize_projects(db, subcon_id)
