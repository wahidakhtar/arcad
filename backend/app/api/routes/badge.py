from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge

router = APIRouter(
    prefix="/badge",
    tags=["badge"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/map")
def badge_map(db: Session = Depends(get_db)):

    rows = db.query(Badge).all()

    return {
        r.id: {
            "label": r.description,
            "color": r.color,
            "key": r.badge_key,
            "type": r.badge_type,
        }
        for r in rows
    }


@router.get("/transitions")
def badge_transitions(
    entity_type_id: int = Query(...),
    current_badge_id: int = Query(...),
    db: Session = Depends(get_db),
):

    rows = db.execute(
        text("""
        SELECT b.id, b.badge_key, b.description, b.color
        FROM schema_core.badge_transition bt
        JOIN schema_core.badge b ON b.id = bt.to_badge_id
        WHERE bt.entity_type_id = :entity_type_id
        AND bt.from_badge_id = :current_badge_id
        """),
        {
            "entity_type_id": entity_type_id,
            "current_badge_id": current_badge_id,
        },
    ).fetchall()

    return [
        {
            "id": r.id,
            "badge_key": r.badge_key,
            "description": r.description,
            "color": r.color,
        }
        for r in rows
    ]