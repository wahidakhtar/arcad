from sqlalchemy.orm import Session
from app.models.mi import Mi


def get_mi_sites(project_id:int, db:Session):

    rows = db.query(Mi).filter(
        Mi.project_id == project_id,
    ).all()

    result=[]

    for r in rows:

        result.append({
            "id": r.id,
            "ckt_id": r.ckt_id,
            "status_badge_id": r.status_badge_id,
            "wcc": r.wcc
        })

    return result


def get_mi_site(site_id:int, db:Session):

    r = db.query(Mi).filter(
        Mi.id == site_id,
    ).first()

    if not r:
        return None

    return {
        "id": r.id,
        "project_id": r.project_id,
        "ckt_id": r.ckt_id,
        "status_badge_id": r.status_badge_id,
        "wcc": r.wcc
    }
