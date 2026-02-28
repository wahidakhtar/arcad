from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge

router = APIRouter(prefix="/api/v1/badge", tags=["badge"])


@router.get("/status")
def status_badges(
    project_id: int = Query(...),
    current_status_id: int = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Return only valid manual transitions

    rows = db.execute(
        """
        SELECT b.id, b.badge_key, b.description, b.color
        FROM schema_core.badge_transition bt
        JOIN schema_core.badge b ON b.id = bt.to_badge_id
        WHERE bt.entity_type_id = 2
        AND bt.project_id = :project_id
        AND bt.from_badge_id = :current_status_id
        AND b.is_manual = TRUE
        """,
        {"project_id": project_id, "current_status_id": current_status_id},
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


@router.get("/doc_state")
def doc_state_badges(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = db.query(Badge).filter(
        Badge.badge_type == "doc_state",
        Badge.is_manual == True
    ).all()

    return [
        {
            "id": b.id,
            "badge_key": b.badge_key,
            "description": b.description,
            "color": b.color,
        }
        for b in badges
    ]
