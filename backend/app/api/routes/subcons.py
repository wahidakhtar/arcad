from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import UserContext, permission_required
from app.core.database import get_db
from app.schemas.subcon import SubconCreate, SubconOut, SubconProjectAssignRequest, SubconProjectOut
from app.services import subcons as subcon_service

router = APIRouter(prefix="/subcons", tags=["subcons"])


@router.get("", response_model=list[SubconOut])
def list_subcons(user: UserContext = Depends(permission_required("subproject", "read")), db: Session = Depends(get_db)):
    return subcon_service.list_subcons(db, user)


@router.post("", response_model=SubconOut)
def create_subcon(payload: SubconCreate, user: UserContext = Depends(permission_required("subproject", "write")), db: Session = Depends(get_db)):
    return subcon_service.create_subcon(db, user, payload)


@router.get("/{subcon_id}", response_model=SubconOut)
def get_subcon(subcon_id: int, user: UserContext = Depends(permission_required("subproject", "read")), db: Session = Depends(get_db)):
    return subcon_service.get_subcon(db, user, subcon_id)


@router.get("/{subcon_id}/projects", response_model=list[SubconProjectOut])
def list_subcon_projects(subcon_id: int, user: UserContext = Depends(permission_required("subproject", "read")), db: Session = Depends(get_db)):
    return subcon_service.list_subcon_projects(db, user, subcon_id)


@router.post("/{subcon_id}/projects", response_model=SubconOut)
def assign_subcon_project(subcon_id: int, payload: SubconProjectAssignRequest, user: UserContext = Depends(permission_required("subproject", "write")), db: Session = Depends(get_db)):
    return subcon_service.assign_subcon_project(db, user, subcon_id, payload.project_id)
