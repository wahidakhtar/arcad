from decimal import Decimal

def compute_mi_financials(rate_value, height_value, paid_value):
    rate = Decimal(rate_value or 0)
    height = Decimal(height_value or 0)
    paid = Decimal(paid_value or 0)

    budget = rate * height
    balance = budget - paid

    return {
        "rate": float(rate),
        "budget": float(budget),
        "cost": float(budget),
        "paid": float(paid),
        "balance": float(balance),
    }
