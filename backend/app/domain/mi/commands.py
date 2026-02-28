from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.mi import Mi
from app.models.badge import Badge
from datetime import timedelta, datetime


def parse_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return value


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


def apply_edd_logic(site):
    if site.permission_date and site.height_m:
        if float(site.height_m) <= 15:
            site.edd = site.permission_date + timedelta(days=15)
        else:
            site.edd = site.permission_date + timedelta(days=21)


def update_site_command(site_id: int, payload: dict, db: Session):
    site = db.query(Mi).filter(Mi.id == site_id).first()
    if not site:
        raise ValueError("Site not found")

    comp_id = get_badge_id(db, "status", "comp")
    perm_wait_id = get_badge_id(db, "status", "perm_wait")
    open_id = get_badge_id(db, "status", "open")
    hold_id = get_badge_id(db, "status", "hold")
    cancel_id = get_badge_id(db, "status", "cancel")

    previous_permission = site.permission_date
    previous_completion = site.completion_date
    previous_status = site.status_badge_id

    # --- FIELD UPDATES ---
    for key, value in payload.items():

        if key in ["receiving_date", "permission_date", "completion_date"]:
            setattr(site, key, parse_date(value))

        elif key == "height_m":
            setattr(site, key, float(value) if value not in (None, "") else None)

        elif key == "wcc_badge_id":
            site.wcc = value

        elif hasattr(site, key):
            setattr(site, key, value)

    # --- MANUAL STATUS TRANSITION (ALWAYS FIRST) ---
    if "status_badge_id" in payload and payload["status_badge_id"] != previous_status:
        requested = payload["status_badge_id"]
        validate_transition(db, site.project_id, previous_status, requested)
        site.status_badge_id = requested

        if requested in [hold_id, cancel_id]:
            site.permission_date = None

    # --- COMPLETION REMOVED ---
    if previous_completion and not site.completion_date:
        site.permission_date = None
        site.status_badge_id = perm_wait_id

    # --- PERMISSION ENTERED ---
    if not previous_permission and site.permission_date:
        site.status_badge_id = open_id

    # --- COMPLETION ENTERED ---
    if not previous_completion and site.completion_date:
        site.status_badge_id = comp_id

    apply_edd_logic(site)

    db.commit()
    db.refresh(site)

    return site
