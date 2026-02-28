from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge
from app.models.mi import Mi

router = APIRouter(prefix="/api/v1/badge", tags=["badge"])


@router.get("/status")
def status_badges(
    project_id: int = Query(...),
    current_status_id: int = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
        SELECT b.id, b.badge_key, b.description, b.color
        FROM schema_core.badge_transition bt
        JOIN schema_core.badge b ON b.id = bt.to_badge_id
        WHERE bt.entity_type_id = 2
        AND bt.project_id = :project_id
        AND bt.from_badge_id = :current_status_id
        AND b.is_manual = TRUE
        """),
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
    entity_type_id: int = Query(...),
    project_id: int = Query(...),
    site_id: int = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    site = db.query(Mi).filter(Mi.id == site_id).first()

    if not site:
        return []

    if entity_type_id in [3, 5] and not site.completion_date:
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

    badges = [
        {
            "id": r.id,
            "badge_key": r.badge_key,
            "description": r.description,
            "color": r.color,
        }
        for r in rows
    ]

    # Ensure current badge is present
    current_value = None

    if entity_type_id == 3:
        current_value = site.invoice_status_badge_id
    elif entity_type_id == 4:
        current_value = site.po_status_badge_id
    elif entity_type_id == 5:
        current_value = site.wcc

    if current_value:
        exists = any(b["id"] == current_value for b in badges)
        if not exists:
            badge = db.query(Badge).filter(Badge.id == current_value).first()
            if badge:
                badges.append({
                    "id": badge.id,
                    "badge_key": badge.badge_key,
                    "description": badge.description,
                    "color": badge.color,
                })

    return badges
