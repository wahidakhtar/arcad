from sqlalchemy.orm import Session
from app.models.mi import Mi


def get_mi_sites(project_id: int, db: Session):
    sites = db.query(Mi).filter(
        Mi.project_id == project_id,
        Mi.is_active == True
    ).all()

    result = []

    for s in sites:
        result.append({
            "id": s.id,
            "project_id": s.project_id,
            "ckt_id": s.ckt_id,
            "customer": s.customer,
            "permission_date": s.permission_date,
            "receiving_date": s.receiving_date,
            "edd": s.edd,
            "completion_date": s.completion_date,
            "status_badge_id": s.status_badge_id,
            "po_status_badge_id": s.po_status_badge_id,
            "invoice_status_badge_id": s.invoice_status_badge_id,
            "wcc_badge_id": s.wcc,
            "height_m": float(s.height_m or 0),
            "city": s.city,
            "lc": s.lc,
            "progress": s.progress,
            "fe": s.fe,
            "paid": float(s.paid or 0),
            "po_no": s.po_no,
            "invoice_no": s.invoice_no
        })

    return result
