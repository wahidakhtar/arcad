from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.fe import Finance
from app.domain.finance.rate_repository import get_rate


# Mast Installation job_id from job_master
MAST_INSTALL_JOB_ID = 1


def compute_mi_financials(site: dict, project_id: int, db: Session):
    height = Decimal(site.get("height_m") or 0)
    receiving_date = site.get("receiving_date")

    rate_row = get_rate(MAST_INSTALL_JOB_ID, receiving_date, db)
    unit_cost = Decimal(rate_row.unit_cost) if rate_row else Decimal(0)

    base_budget = unit_cost * height

    executed_surcharges = Decimal(0)
    approved_surcharges = Decimal(0)
    paid = Decimal(0)

    rows = (
        db.query(Finance)
        .filter(
            Finance.project_id == project_id,
            Finance.site_id == site["id"],
        )
        .all()
    )

    for r in rows:
        amt = Decimal(r.amount or 0)

        if r.type == "surcharge":
            if r.state == "executed":
                executed_surcharges += amt
            if r.state == "executed" and r.approval:
                approved_surcharges += amt

        if r.type == "payment" and r.state == "executed":
            paid += amt

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