from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.badge import Badge
from app.models.mi import Mi

from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project

router = APIRouter(prefix="/api/v1/badge", tags=["badge"])


@router.get("/status")
def status_badges(
    project_id: int = Query(...),
    current_status_id: int = Query(...),
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)
    require(policy.can_toggle_status())

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
    role=Depends(get_role),
    db: Session = Depends(get_db),
):
    policy = resolve_policy_for_project(role, project_id, db)

    # Determine which toggle applies
    if entity_type_id == 3:
        require(policy.can_toggle_invoice())
    elif entity_type_id == 4:
        require(policy.can_toggle_po())
    elif entity_type_id == 5:
        require(policy.can_toggle_wcc())
    else:
        require(policy.can_view_finance())

    site = db.query(Mi).filter(Mi.id == site_id).first()
    if not site:
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
