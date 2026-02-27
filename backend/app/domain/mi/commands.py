from sqlalchemy.orm import Session
from app.models.mi import Mi
from app.models.badge import Badge
from datetime import timedelta, datetime


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return value


def get_pending_badge_id(db: Session):
    badge = db.query(Badge).filter(
        Badge.badge_type == "doc_state",
        Badge.badge_key == "pend"
    ).first()
    return badge.id if badge else None


def validate_dates(existing_site, receiving, permission, completion):
    if completion and not permission:
        raise ValueError("Permission date required before Completion date")

    if receiving and permission and receiving > permission:
        raise ValueError("Receiving date must be before or equal to Permission date")

    if permission and completion and permission > completion:
        raise ValueError("Permission date must be before or equal to Completion date")

    if existing_site.permission_date and not permission and existing_site.completion_date:
        raise ValueError("Cannot clear Permission date after Completion date is set")

    if existing_site.receiving_date and not receiving and existing_site.permission_date:
        raise ValueError("Cannot clear Receiving date after Permission date is set")


def apply_edd_logic(site):
    if site.permission_date and site.height_m:
        if site.height_m <= 15:
            site.edd = site.permission_date + timedelta(days=15)
        else:
            site.edd = site.permission_date + timedelta(days=21)


def apply_document_logic(site, previous_completion, db):
    pending_id = get_pending_badge_id(db)

    if site.po_status_badge_id is None:
        site.po_status_badge_id = pending_id

    if previous_completion is None and site.completion_date:
        site.wcc = pending_id
        site.invoice_status_badge_id = pending_id


def update_site_command(site_id: int, payload: dict, db: Session):
    site = db.query(Mi).filter(Mi.id == site_id).first()
    if not site:
        raise ValueError("Site not found")

    previous_completion = site.completion_date

    receiving = parse_date(payload.get("receiving_date", site.receiving_date))
    permission = parse_date(payload.get("permission_date", site.permission_date))
    completion = parse_date(payload.get("completion_date", site.completion_date))

    validate_dates(site, receiving, permission, completion)

    for key, value in payload.items():
        if key in ["receiving_date", "permission_date", "completion_date"]:
            setattr(site, key, parse_date(value))
        elif hasattr(site, key):
            setattr(site, key, value)

    apply_edd_logic(site)
    apply_document_logic(site, previous_completion, db)

    db.commit()
    db.refresh(site)

    return site
