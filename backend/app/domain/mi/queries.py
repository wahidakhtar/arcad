from sqlalchemy.orm import Session
from app.models.mi import Mi
from app.models.badge import Badge

def fetch_sites(project_id: int, db: Session):
    site_list = db.query(Mi).filter(
        Mi.is_active == True,
        Mi.project_id == project_id
    ).all()

    result = []

    for s in site_list:
        status_badge = db.query(Badge).filter(Badge.id == s.status_badge_id).first() if s.status_badge_id else None
        po_badge = db.query(Badge).filter(Badge.id == s.po_status_badge_id).first() if s.po_status_badge_id else None
        invoice_badge = db.query(Badge).filter(Badge.id == s.invoice_status_badge_id).first() if s.invoice_status_badge_id else None
        wcc_badge = db.query(Badge).filter(Badge.id == s.wcc).first() if s.wcc else None

        result.append({
            "model": s,
            "status_badge": status_badge,
            "po_badge": po_badge,
            "invoice_badge": invoice_badge,
            "wcc_badge": wcc_badge,
        })

    return result
