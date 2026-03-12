from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.rate_card import RateCard


def get_rate(job_id: int, receiving_date, db: Session):
    """
    Return the applicable RateCard row for a job at a given date.

    Rule:
        effective_date <= receiving_date
        choose the latest effective_date
    """
    return (
        db.query(RateCard)
        .filter(
            RateCard.job_id == job_id,
            RateCard.effective_date <= receiving_date,
            RateCard.is_active.is_(True),
        )
        .order_by(desc(RateCard.effective_date))
        .first()
    )