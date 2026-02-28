from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.badge import Badge


def get_badge_id(db: Session, badge_type: str, badge_key: str):
    badge = db.query(Badge).filter(
        Badge.badge_type == badge_type,
        Badge.badge_key == badge_key
    ).first()
    return badge.id if badge else None


def validate_transition(db: Session, project_id: int, from_id: int, to_id: int):
    result = db.execute(
        text("""
        SELECT 1
        FROM schema_core.badge_transition
        WHERE entity_type_id = 2
        AND project_id = :project_id
        AND from_badge_id = :from_id
        AND to_badge_id = :to_id
        """),
        {"project_id": project_id, "from_id": from_id, "to_id": to_id}
    ).fetchone()

    if not result:
        raise ValueError("Invalid status transition")


def process_status(site, payload, db: Session, previous_state):

    comp_id = get_badge_id(db, "status", "comp")
    perm_wait_id = get_badge_id(db, "status", "perm_wait")
    open_id = get_badge_id(db, "status", "open")
    hold_id = get_badge_id(db, "status", "hold")
    cancel_id = get_badge_id(db, "status", "cancel")

    previous_permission = previous_state["permission_date"]
    previous_completion = previous_state["completion_date"]
    previous_status = previous_state["status_badge_id"]

    # Manual transition
    if "status_badge_id" in payload and payload["status_badge_id"] != previous_status:
        requested = payload["status_badge_id"]
        validate_transition(db, site.project_id, previous_status, requested)
        site.status_badge_id = requested

        if requested in [hold_id, cancel_id]:
            site.permission_date = None

    # Completion removed
    if previous_completion and not site.completion_date:
        site.permission_date = None
        site.status_badge_id = perm_wait_id

    # Permission entered
    if not previous_permission and site.permission_date:
        site.status_badge_id = open_id

    # Completion entered
    if not previous_completion and site.completion_date:
        site.status_badge_id = comp_id
