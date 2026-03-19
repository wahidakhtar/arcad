from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Optional

ZERO = Decimal("0.00")

JOB_BUCKETS: dict[str, list[str]] = {
    "bmi": ["mi"],
    "bmdv": ["mdv"],
    "bmd": ["md"],
    "bma": ["ma"],
    "bmc": ["mpaint", "mnbr", "ep", "ec", "arr"],
}

SURCHARGE_TYPES = {"b_sur", "e_sur"}
FE_PAYMENT_TYPE = "fe_pay"
REFUND_TYPE = "ref"
EXECUTED_STATUS = "exct"
COMPLETED_STATUS = "comp"


@dataclass
class RateCardRow:
    job_key: str
    effective_date: date
    cost: Decimal


@dataclass
class TransactionRow:
    recipient_id: Optional[int]
    bucket_key: Optional[str]
    type_key: str
    amount: Decimal
    status_key: str


@dataclass
class FEAssignmentRow:
    fe_id: int
    bucket_key: str
    active: bool
    final_cost: Optional[Decimal]


def _as_decimal(value: Any) -> Decimal:
    if value is None or value == "":
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _job_quantity(site: dict[str, Any], job_key: str) -> Decimal:
    if job_key == "ec":
        return _as_decimal(site.get("ec"))
    raw = site.get(job_key)
    return Decimal("1") if raw else ZERO


def _select_rate(job_key: str, receiving_date: date, rate_rows: list[RateCardRow]) -> Decimal:
    eligible = [row for row in rate_rows if row.job_key == job_key and row.effective_date <= receiving_date]
    if not eligible:
        return ZERO
    return max(eligible, key=lambda row: row.effective_date).cost


def _sum_transactions(
    transactions: list[TransactionRow],
    *,
    type_keys: set[str],
    bucket_key: Optional[str] = None,
    recipient_id: Optional[int] = None,
) -> Decimal:
    total = ZERO
    for row in transactions:
        if row.status_key != EXECUTED_STATUS or row.type_key not in type_keys:
            continue
        if bucket_key is not None and row.bucket_key != bucket_key:
            continue
        if recipient_id is not None and row.recipient_id != recipient_id:
            continue
        total += row.amount
    return total


def site_cost_for_bucket(
    site: dict[str, Any],
    bucket_key: str,
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> Decimal:
    receiving_date = site["receiving_date"]
    amount = ZERO
    for job_key in JOB_BUCKETS[bucket_key]:
        qty = _job_quantity(site, job_key)
        if qty == ZERO:
            continue
        amount += _select_rate(job_key, receiving_date, rate_rows) * qty
    amount += _sum_transactions(transactions, type_keys={"b_sur", "e_sur"}, bucket_key=bucket_key)
    return amount


def fe_budget(
    site: dict[str, Any],
    fe_id: int,
    bucket_key: str,
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> Decimal:
    receiving_date = site["receiving_date"]
    amount = ZERO
    for job_key in JOB_BUCKETS[bucket_key]:
        qty = _job_quantity(site, job_key)
        if qty == ZERO:
            continue
        amount += _select_rate(job_key, receiving_date, rate_rows) * qty
    amount += _sum_transactions(transactions, type_keys={"b_sur"}, bucket_key=bucket_key, recipient_id=fe_id)
    return amount


def fe_cost(
    site: dict[str, Any],
    assignment: FEAssignmentRow,
    assignments: list[FEAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> Decimal:
    if not assignment.active and assignment.final_cost is not None:
        return assignment.final_cost

    if assignment.active:
        bucket_total = site_cost_for_bucket(site, assignment.bucket_key, transactions, rate_rows)
        inactive_total = sum(
            assignment_row.final_cost or ZERO
            for assignment_row in assignments
            if assignment_row.bucket_key == assignment.bucket_key and not assignment_row.active
        )
        return max(bucket_total - inactive_total, ZERO)

    return ZERO


def fe_paid(transactions: list[TransactionRow], fe_id: int) -> Decimal:
    paid = _sum_transactions(transactions, type_keys={FE_PAYMENT_TYPE}, recipient_id=fe_id)
    refunds = _sum_transactions(transactions, type_keys={REFUND_TYPE}, recipient_id=fe_id)
    return paid - refunds


def scrap_value(site: dict[str, Any], bucket_key: str) -> Decimal:
    if bucket_key != "bmd":
        return ZERO
    return _as_decimal(site.get("scrap_value"))


def fe_balance(
    site: dict[str, Any],
    assignment: FEAssignmentRow,
    assignments: list[FEAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> Decimal:
    if assignment.active and site.get("status_key") != COMPLETED_STATUS:
        return ZERO
    return fe_cost(site, assignment, assignments, transactions, rate_rows) - fe_paid(transactions, assignment.fe_id) - scrap_value(site, assignment.bucket_key)


def calculate_site_financials(
    site: dict[str, Any],
    assignments: list[FEAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> dict[str, Any]:
    by_fe: list[dict[str, Any]] = []
    budget = ZERO
    cost = ZERO
    paid = ZERO
    for assignment in assignments:
        row_budget = fe_budget(site, assignment.fe_id, assignment.bucket_key, transactions, rate_rows)
        row_cost = fe_cost(site, assignment, assignments, transactions, rate_rows)
        row_paid = fe_paid(transactions, assignment.fe_id)
        row_balance = fe_balance(site, assignment, assignments, transactions, rate_rows)
        budget += row_budget
        cost += row_cost
        paid += row_paid
        by_fe.append(
            {
                "fe_id": assignment.fe_id,
                "bucket_key": assignment.bucket_key,
                "active": assignment.active,
                "budget": row_budget,
                "cost": row_cost,
                "paid": row_paid,
                "balance": row_balance,
            }
        )

    site_balance = ZERO if site.get("status_key") != COMPLETED_STATUS else cost - paid - scrap_value(site, "bmd")
    return {"budget": budget, "cost": cost, "paid": paid, "balance": site_balance, "fe_rows": by_fe}


def calculate_fo_view(
    site: dict[str, Any],
    fe_id: int,
    bucket_key: str,
    assignments: list[FEAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
) -> dict[str, Decimal]:
    target = next((row for row in assignments if row.fe_id == fe_id and row.bucket_key == bucket_key), None)
    if target is None:
        return {"cost": ZERO, "paid": ZERO, "balance": ZERO}
    return {
        "cost": fe_cost(site, target, assignments, transactions, rate_rows),
        "paid": fe_paid(transactions, fe_id),
        "balance": fe_balance(site, target, assignments, transactions, rate_rows),
    }
