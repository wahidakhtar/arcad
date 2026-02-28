from sqlalchemy.orm import Session
from app.models.mi import Mi
from app.models.badge import Badge


def get_mi_sites(project_id: int, db: Session):

    rows = (
        db.query(
            Mi,
            Badge.id,
            Badge.description,
            Badge.color
        )
        .outerjoin(Badge, Badge.id == Mi.status_badge_id)
        .filter(
            Mi.project_id == project_id,
            Mi.is_active == True
        )
        .all()
    )

    result = []

    for row in rows:
        site = row[0]
        badge_id = row[1]
        badge_label = row[2]
        badge_color = row[3]

        result.append({
            "id": site.id,
            "project_id": site.project_id,
            "ckt_id": site.ckt_id,
            "customer": site.customer,
            "permission_date": site.permission_date,
            "receiving_date": site.receiving_date,
            "edd": site.edd,
            "completion_date": site.completion_date,

            "status_badge_id": badge_id,
            "status_label": badge_label,
            "status_color": badge_color,

            "po_status_badge_id": site.po_status_badge_id,
            "invoice_status_badge_id": site.invoice_status_badge_id,
            "wcc_badge_id": site.wcc,

            "height_m": float(site.height_m or 0),
            "city": site.city,
            "lc": site.lc,
            "progress": site.progress,
            "fe": site.fe,
            "paid": float(site.paid or 0),
            "po_no": site.po_no,
            "invoice_no": site.invoice_no
        })

    return result
