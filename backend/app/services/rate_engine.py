from sqlalchemy.orm import Session
from sqlalchemy import desc
from decimal import Decimal
from app.models.mi_rate_card import MiRateCard

def calculate_mi_financials(site, db: Session):
    if not site.receiving_date:
        return None

    rate_row = (
        db.query(MiRateCard)
        .filter(
            MiRateCard.job == "mast installation",
            MiRateCard.effective_date <= site.receiving_date
        )
        .order_by(desc(MiRateCard.effective_date))
        .first()
    )

    rate = Decimal(rate_row.unit_cost) if rate_row else Decimal(0)
    height = Decimal(site.height_m) if site.height_m else Decimal(0)
    paid = Decimal(site.paid) if site.paid else Decimal(0)

    budget = rate * height
    balance = budget - paid

    return {
        "rate": float(rate),
        "budget": float(budget),
        "cost": float(budget),
        "paid": float(paid),
        "balance": float(balance),
    }
