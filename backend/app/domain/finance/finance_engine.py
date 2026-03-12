from app.domain.finance.calculator_registry import CALCULATORS


def compute_financials(project_code, site, project_id, db):

    calculator = CALCULATORS.get(project_code)

    if not calculator:
        return {
            "base_budget": 0,
            "budget": 0,
            "cost": 0,
            "paid": 0,
            "balance": 0
        }

    return calculator(site, project_id, db)