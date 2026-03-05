from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.mi import Mi
from .status_engine import get_badge_id
from .utils import normalize_ckt


def create_site_command(payload, db: Session):

    perm_wait_id = get_badge_id(db, "status", "perm_wait")
    pending_doc_id = get_badge_id(db, "doc_state", "pend")

    normalized_ckt = normalize_ckt(payload.ckt_id)

    new_site = Mi(
        project_id=payload.project_id,
        ckt_id=normalized_ckt,
        customer=payload.customer,
        receiving_date=payload.receiving_date,
        height_m=payload.height_m,
        city=payload.city,
        lc=payload.lc,

        status_badge_id=perm_wait_id,
        wcc=None,

        permission_date=None,
        completion_date=None,
    )

    try:
        db.add(new_site)
        db.commit()
        db.refresh(new_site)
    except IntegrityError as e:
        db.rollback()
        raise ValueError(str(e))

    return new_site
