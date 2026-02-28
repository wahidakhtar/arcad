from sqlalchemy.orm import Session
from app.models.mi import Mi
from .status_engine import process_status, get_badge_id
from .date_engine import apply_edd_logic, parse_date
from .utils import normalize_ckt


def update_site_command(site_id: int, payload: dict, db: Session):
    site = db.query(Mi).filter(Mi.id == site_id).first()
    if not site:
        raise ValueError("Site not found")

    previous_state = {
        "permission_date": site.permission_date,
        "completion_date": site.completion_date,
        "status_badge_id": site.status_badge_id,
    }

    for key, value in payload.items():

        if key in ["receiving_date", "permission_date", "completion_date"]:
            setattr(site, key, parse_date(value))

        elif key == "height_m":
            setattr(site, key, float(value) if value not in (None, "") else None)

        elif key == "ckt_id":
            setattr(site, key, normalize_ckt(value))

        elif key == "wcc_badge_id":
            site.wcc = value

        elif hasattr(site, key):
            setattr(site, key, value)

    process_status(site, payload, db, previous_state)
    apply_edd_logic(site)

    # Set invoice/wcc Pending on completion
    if site.completion_date:
        pending_doc_id = get_badge_id(db, "doc_state", "pend")
        if site.invoice_status_badge_id is None:
            site.invoice_status_badge_id = pending_doc_id
        if site.wcc is None:
            site.wcc = pending_doc_id

    db.commit()
    db.refresh(site)

    return site
