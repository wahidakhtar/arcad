from sqlalchemy.orm import Session
from app.models.mi import Mi


def row_to_dict(r):
    return {c.name: getattr(r, c.name) for c in r.__table__.columns}


def get_mi_sites(project_id:int, db:Session):

    rows = db.query(Mi).filter(
        Mi.project_id == project_id
    ).all()

    return [row_to_dict(r) for r in rows]


def get_mi_site(site_id:int, db:Session):

    r = db.query(Mi).filter(
        Mi.id == site_id
    ).first()

    if not r:
        return None

    return row_to_dict(r)
