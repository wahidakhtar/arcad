from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.core import IndianState, JobBucket


def list_states(db: Session) -> list[IndianState]:
    return db.execute(select(IndianState).order_by(IndianState.label.asc())).scalars().all()


def list_job_buckets(db: Session) -> list[JobBucket]:
    return db.execute(select(JobBucket).order_by(JobBucket.id.asc())).scalars().all()
