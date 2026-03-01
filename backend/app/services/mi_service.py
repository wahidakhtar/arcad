from sqlalchemy.orm import Session
from sqlalchemy.orm import aliased
from app.models.mi import Mi
from app.models.badge import Badge


def get_mi_sites(project_id: int, db: Session):

    status_b = aliased(Badge)
    po_b = aliased(Badge)
    invoice_b = aliased(Badge)
    wcc_b = aliased(Badge)

    rows = (
        db.query(
            Mi,
            status_b.description,
            status_b.color,
            po_b.description,
            po_b.color,
            invoice_b.description,
            invoice_b.color,
            wcc_b.description,
            wcc_b.color,
        )
        .outerjoin(status_b, status_b.id == Mi.status_badge_id)
        .outerjoin(po_b, po_b.id == Mi.po_status_badge_id)
        .outerjoin(invoice_b, invoice_b.id == Mi.invoice_status_badge_id)
        .outerjoin(wcc_b, wcc_b.id == Mi.wcc)
        .filter(
            Mi.project_id == project_id,
            Mi.is_active == True
        )
        .all()
    )

    result = []

    for row in rows:
        site = row[0]

        result.append({
            "id": site.id,
            "project_id": site.project_id,
            "ckt_id": site.ckt_id,
            "customer": site.customer,
            "permission_date": site.permission_date,
            "receiving_date": site.receiving_date,
            "edd": site.edd,
            "completion_date": site.completion_date,

            "status_badge_id": site.status_badge_id,
            "status_label": row[1],
            "status_color": row[2],

            "po_status_badge_id": site.po_status_badge_id,
            "po_status_label": row[3],
            "po_status_color": row[4],

            "invoice_status_badge_id": site.invoice_status_badge_id,
            "invoice_status_label": row[5],
            "invoice_status_color": row[6],

            "wcc": site.wcc,
            "wcc_label": row[7],
            "wcc_color": row[8],

            "height_m": float(site.height_m or 0),
            "city": site.city,
            "lc": site.lc,
            "progress": site.progress,
            "fe": site.fe,
            "paid": float(site.paid or 0),
            "po_no": site.po_no,
            "invoice_no": site.invoice_no,
        })

    return result


def get_mi_site(site_id: int, db: Session):

    status_b = aliased(Badge)
    po_b = aliased(Badge)
    invoice_b = aliased(Badge)
    wcc_b = aliased(Badge)

    row = (
        db.query(
            Mi,
            status_b.description,
            status_b.color,
            po_b.description,
            po_b.color,
            invoice_b.description,
            invoice_b.color,
            wcc_b.description,
            wcc_b.color,
        )
        .outerjoin(status_b, status_b.id == Mi.status_badge_id)
        .outerjoin(po_b, po_b.id == Mi.po_status_badge_id)
        .outerjoin(invoice_b, invoice_b.id == Mi.invoice_status_badge_id)
        .outerjoin(wcc_b, wcc_b.id == Mi.wcc)
        .filter(
            Mi.id == site_id,
            Mi.is_active == True
        )
        .first()
    )

    if not row:
        return None

    site = row[0]

    return {
        "id": site.id,
        "project_id": site.project_id,
        "ckt_id": site.ckt_id,
        "customer": site.customer,
        "permission_date": site.permission_date,
        "receiving_date": site.receiving_date,
        "edd": site.edd,
        "completion_date": site.completion_date,

        "status_badge_id": site.status_badge_id,
        "status_label": row[1],
        "status_color": row[2],

        "po_status_badge_id": site.po_status_badge_id,
        "po_status_label": row[3],
        "po_status_color": row[4],

        "invoice_status_badge_id": site.invoice_status_badge_id,
        "invoice_status_label": row[5],
        "invoice_status_color": row[6],

        "wcc": site.wcc,
        "wcc_label": row[7],
        "wcc_color": row[8],

        "height_m": float(site.height_m or 0),
        "city": site.city,
        "lc": site.lc,
        "progress": site.progress,
        "fe": site.fe,
        "paid": float(site.paid or 0),
        "po_no": site.po_no,
        "invoice_no": site.invoice_no,
    }
