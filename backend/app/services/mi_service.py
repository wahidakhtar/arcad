from sqlalchemy.orm import Session
from app.models.mi import Mi
from app.models.badge import Badge
from app.services.rate_engine import calculate_mi_financials

def get_mi_sites(project_id: int, db: Session):
    site_list = db.query(Mi).filter(
        Mi.is_active == True,
        Mi.project_id == project_id
    ).all()

    result = []

    for s in site_list:
        financials = calculate_mi_financials(s, db)

        badge = None
        if s.status_badge_id:
            badge = db.query(Badge).filter(Badge.id == s.status_badge_id).first()

        result.append({
            "id": s.id,
            "ckt_id": s.ckt_id,
            "customer": s.customer,
            "receiving_date": s.receiving_date,
            "status": badge.badge_key if badge else None,
            "status_color": badge.color if badge else None,
            "height_m": s.height_m,
            "city": s.city,
            "lc": s.lc,
            **(financials or {})
        })

    return result


def create_mi_site(payload, db: Session):
    new_site = Mi(
        project_id=payload.project_id,
        ckt_id=payload.ckt_id,
        customer=payload.customer,
        receiving_date=payload.receiving_date,
        height_m=payload.height_m,
        city=payload.city,
        lc=payload.lc,
        status_badge_id=1,  # default open
    )

    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    return new_site
