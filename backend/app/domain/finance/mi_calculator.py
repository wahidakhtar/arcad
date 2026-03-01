from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.fe import Finance

def compute_mi_financials(rate_value, height_value, paid_value, project_id=None, site_id=None, db: Session=None):

    rate = Decimal(rate_value or 0)
    height = Decimal(height_value or 0)
    paid = Decimal(paid_value or 0)

    base_budget = rate * height

    executed_surcharges = Decimal(0)
    approved_surcharges = Decimal(0)

    if db and project_id and site_id:
        rows = db.query(Finance).filter(
            Finance.project_id == project_id,
            Finance.site_id == site_id,
            Finance.type == "surcharge",
            Finance.state == "executed"
        ).all()

        for r in rows:
            amt = Decimal(r.amount)
            executed_surcharges += amt
            if r.approval:
                approved_surcharges += amt

    budget = base_budget + approved_surcharges
    cost = base_budget + executed_surcharges
    balance = cost - paid

    return {
        "base_budget": float(base_budget),
        "budget": float(budget),
        "cost": float(cost),
        "paid": float(paid),
        "balance": float(balance),
    }
