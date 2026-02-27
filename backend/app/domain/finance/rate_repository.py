from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.mi_rate_card import MiRateCard

def get_latest_rate_for_date(job: str, date, db: Session):
    return (
        db.query(MiRateCard)
        .filter(
            MiRateCard.job == job,
            MiRateCard.effective_date <= date
        )
        .order_by(desc(MiRateCard.effective_date))
        .first()
    )
