from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.schemas.admin import BadgeTransitionCreate, BadgeUpdate, JobUpdate, RoleTagUpdate, UIFieldReorder, UIFieldUpdate
from app.services import admin as admin_service

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_PROJECTS = {"mi", "md", "ma", "mc", "bb"}
VALID_TRANSITION_PROJECTS = {"mi", "md", "ma", "mc"}
VALID_SCALE_BY = {"height", "height_if_true", "numeric", "visit_date", "unit"}


@router.get("/badges", dependencies=[Depends(permission_required("admin", "read"))])
def list_badges(db: Session = Depends(get_db)):
    return admin_service.list_badges(db)


@router.patch("/badges/{badge_id}", dependencies=[Depends(permission_required("admin", "write"))])
def update_badge(badge_id: int, payload: BadgeUpdate, db: Session = Depends(get_db)):
    return admin_service.update_badge(db, badge_id, payload)


@router.get("/badge-transitions", dependencies=[Depends(permission_required("admin", "read"))])
def list_badge_transitions(db: Session = Depends(get_db)):
    return admin_service.list_badge_transitions(db)


@router.post("/badge-transitions", dependencies=[Depends(permission_required("admin", "write"))])
def create_badge_transition(payload: BadgeTransitionCreate, db: Session = Depends(get_db)):
    if payload.project not in VALID_TRANSITION_PROJECTS:
        raise HTTPException(400, "Invalid project")
    return admin_service.create_badge_transition(db, payload)


@router.delete("/badge-transitions/{project}/{transition_id}", dependencies=[Depends(permission_required("admin", "write"))])
def delete_badge_transition(project: str, transition_id: int, db: Session = Depends(get_db)):
    if project not in VALID_TRANSITION_PROJECTS:
        raise HTTPException(400, "Invalid project")
    admin_service.delete_badge_transition(db, project, transition_id)
    return {"ok": True}


@router.get("/ui-fields", dependencies=[Depends(permission_required("admin", "read"))])
def list_ui_fields(db: Session = Depends(get_db)):
    return admin_service.list_ui_fields(db)


@router.patch("/ui-fields/{project}/{field_id}", dependencies=[Depends(permission_required("admin", "write"))])
def update_ui_field(project: str, field_id: int, payload: UIFieldUpdate, db: Session = Depends(get_db)):
    if project not in VALID_PROJECTS:
        raise HTTPException(400, "Invalid project")
    return admin_service.update_ui_field(db, project, field_id, payload)


@router.post("/ui-fields/{project}/reorder", dependencies=[Depends(permission_required("admin", "write"))])
def reorder_ui_fields(project: str, payload: UIFieldReorder, db: Session = Depends(get_db)):
    if project not in VALID_PROJECTS:
        raise HTTPException(400, "Invalid project")
    admin_service.reorder_ui_fields(db, project, payload)
    return {"ok": True}


@router.get("/jobs", dependencies=[Depends(permission_required("admin", "read"))])
def list_jobs(db: Session = Depends(get_db)):
    return admin_service.list_jobs(db)


@router.patch("/jobs/{job_id}", dependencies=[Depends(permission_required("admin", "write"))])
def update_job(job_id: int, payload: JobUpdate, db: Session = Depends(get_db)):
    if payload.scale_by is not None and payload.scale_by not in VALID_SCALE_BY:
        raise HTTPException(400, f"Invalid scale_by. Must be one of: {', '.join(VALID_SCALE_BY)}")
    return admin_service.update_job(db, job_id, payload)


@router.get("/role-tags", dependencies=[Depends(permission_required("admin", "read"))])
def list_role_tags(db: Session = Depends(get_db)):
    return admin_service.list_role_tags(db)


@router.patch("/role-tags", dependencies=[Depends(permission_required("admin", "write"))])
def update_role_tag(payload: RoleTagUpdate, db: Session = Depends(get_db)):
    return admin_service.update_role_tag(db, payload)
