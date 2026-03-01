from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.rate_card import RateCard

def get_latest_rate_for_date(job_id: int, date, db: Session):
    return (
        db.query(RateCard)
        .filter(
            RateCard.job_id == job_id,
            RateCard.effective_date <= date,
            RateCard.is_active == True
        )
        .order_by(desc(RateCard.effective_date))
        .first()
    )
