from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache import STATES_TTL, cache_get, cache_set, global_states_key
from app.models.core import IndianState, JobBucket


def list_states(db: Session) -> list[dict]:
    cached = cache_get(global_states_key())
    if cached is not None:
        return cached
    rows = db.execute(select(IndianState).order_by(IndianState.label.asc())).scalars().all()
    result = [{"id": r.id, "label": r.label} for r in rows]
    cache_set(global_states_key(), result, STATES_TTL)
    return result


def list_job_buckets(db: Session) -> list[JobBucket]:
    return db.execute(select(JobBucket).order_by(JobBucket.id.asc())).scalars().all()
