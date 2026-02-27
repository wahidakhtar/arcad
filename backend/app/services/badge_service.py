from sqlalchemy.orm import Session
from app.models.badge import Badge

def get_status_badges(db: Session):
    return db.query(Badge).filter(Badge.badge_type == "status").all()
