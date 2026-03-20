from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user
from app.core.database import get_db
from app.schemas.site import ProjectCreate, SubprojectCreate
from app.services import projects as project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.list_projects(db, user)


@router.post("")
def create_project(payload: ProjectCreate, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.create_project(db, user, payload.key, payload.label)


@router.get("/counts")
def counts(user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.sidebar_counts(db, user)


@router.get("/{project_key}/ui-fields")
def ui_fields(project_key: str, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.list_ui_fields(db, user, project_key)


@router.get("/{project_key}/badge-transitions")
def badge_transitions(project_key: str, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.list_badge_transitions(db, user, project_key)


@router.get("/{project_key}/job-buckets")
def project_job_buckets(project_key: str, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.list_project_buckets(db, user, project_key)


@router.get("/{project_key}/providers")
def project_providers(project_key: str, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    if project_key != "bb":
        return []
    return project_service.list_bb_providers(db, user)


@router.post("/subprojects")
def create_subproject(payload: SubprojectCreate, user: UserContext = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_service.create_subproject(db, user, payload.project_key, payload.batch_date, payload.rows)
