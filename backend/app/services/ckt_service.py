import re
from sqlalchemy.orm import Session
from app.models.mi import Mi


def normalize_ckt(ckt: str) -> str:
    if not ckt:
        return ""

    cleaned = re.sub(r"\s+", "", ckt)
    return cleaned.upper()


def validate_unique_ckt(project_id: int, ckt_id: str, db: Session):
    existing = db.query(Mi).filter(
        Mi.project_id == project_id,
        Mi.ckt_id == ckt_id,
        Mi.is_active == True
    ).first()

    if existing:
        return existing

    return None
