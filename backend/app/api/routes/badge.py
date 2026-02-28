from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge
from app.models.mi import Mi
from app.models.entity_type import EntityType

router = APIRouter(prefix="/api/v1/badge", tags=["badge"])


@router.get("/status")
def status_badges(
    project_id: int = Query(...),
    current_status_id: int = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Resolve entity_type dynamically
    site_entity = db.query(EntityType).filter(EntityType.code == "site").first()

    if not site_entity:
        return []

    rows = db.execute(
        text("""
        SELECT b.id, b.badge_key, b.description, b.color
        FROM schema_core.badge_transition bt
        JOIN schema_core.badge b ON b.id = bt.to_badge_id
        WHERE bt.entity_type_id = :entity_type_id
        AND bt.project_id = :project_id
        AND bt.from_badge_id = :current_status_id
        AND b.is_manual = TRUE
        """),
        {
            "entity_type_id": site_entity.id,
            "project_id": project_id,
            "current_status_id": current_status_id,
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


@router.get("/doc_state")
def doc_state_badges(
    entity_type_id: int = Query(...),
    project_id: int = Query(...),
    site_id: int = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    site = db.query(Mi).filter(Mi.id == site_id).first()

    if not site:
        return []

    # Applicability rules
    if entity_type_id in [3, 5]:  # invoice or wcc
        if not site.completion_date:
            return []

    rows = db.execute(
        text("""
        SELECT b.id, b.badge_key, b.description, b.color
        FROM schema_core.badge_entity_map bem
        JOIN schema_core.badge b ON b.id = bem.badge_id
        WHERE bem.entity_type_id = :entity_type_id
        AND b.badge_type = 'doc_state'
        AND b.is_manual = TRUE
        ORDER BY b.id
        """),
        {"entity_type_id": entity_type_id},
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
