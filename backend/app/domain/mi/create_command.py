from sqlalchemy.orm import Session
from app.models.mi import Mi
from app.models.badge import Badge


def get_badge_id(db: Session, badge_type: str, badge_key: str):
    badge = db.query(Badge).filter(
        Badge.badge_type == badge_type,
        Badge.badge_key == badge_key
    ).first()
    return badge.id if badge else None


def create_site_command(payload, db: Session):
    perm_wait_id = get_badge_id(db, "status", "perm_wait")
    pending_doc = get_badge_id(db, "doc_state", "pend")

    new_site = Mi(
        project_id=payload.project_id,
        ckt_id=payload.ckt_id,
        customer=payload.customer,
        receiving_date=payload.receiving_date,
        height_m=payload.height_m,
        city=payload.city,
        lc=payload.lc,
        status_badge_id=perm_wait_id,
        po_status_badge_id=pending_doc,
        permission_date=None,
        completion_date=None
    )

    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    return new_site
