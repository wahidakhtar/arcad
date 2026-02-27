from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge

router = APIRouter(prefix="/api/v1/badge", tags=["badge"])

@router.get("/status")
def status_badges(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = db.query(Badge).filter(Badge.badge_type == "status").all()
    return [
        {
            "id": b.id,
            "badge_key": b.badge_key,
            "description": b.description,
            "color": b.color,
        }
        for b in badges
    ]


@router.get("/doc_state")
def doc_state_badges(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = db.query(Badge).filter(Badge.badge_type == "doc_state").all()
    return [
        {
            "id": b.id,
            "badge_key": b.badge_key,
            "description": b.description,
            "color": b.color,
        }
        for b in badges
    ]
