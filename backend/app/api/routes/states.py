from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import states as state_service

router = APIRouter(tags=["states"])


@router.get("/indian-states")
def list_states(db: Session = Depends(get_db)):
    return state_service.list_states(db)


@router.get("/job-buckets")
def list_job_buckets(db: Session = Depends(get_db)):
    return state_service.list_job_buckets(db)
