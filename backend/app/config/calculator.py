from __future__ import annotations

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
    type_key: str
    amount: Decimal
    status_key: str


@dataclass
class SubconAssignmentRow:
    id: int
    subcon_id: int
    bucket_key: str
    active: bool


def _as_decimal(value: Any) -> Decimal:
    if value is None or value == "":
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _job_quantity(site: dict[str, Any], job_key: str, scale_by: str) -> Decimal:
    if scale_by == "height":
        return _as_decimal(site.get("height"))
    if scale_by == "height_if_true":
        return _as_decimal(site.get("height")) if site.get(job_key) else ZERO
    if scale_by == "numeric":
        return _as_decimal(site.get(job_key))
    if scale_by == "visit_date":
        return Decimal("1") if site.get("visit_date") else ZERO
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
    recipient_id: Optional[int] = None,
) -> Decimal:
    total = ZERO
    for row in transactions:
        if row.status_key != EXECUTED_STATUS or row.type_key not in type_keys:
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
    job_scales: dict[str, str],
) -> Decimal:
    receiving_date = site["receiving_date"]
    amount = ZERO
    for job_key in JOB_BUCKETS[bucket_key]:
        scale_by = job_scales.get(job_key, "unit")
        qty = _job_quantity(site, job_key, scale_by)
        if qty == ZERO:
            continue
        amount += _select_rate(job_key, receiving_date, rate_rows) * qty
    # Each site belongs to one bucket, so all site surcharges apply here
    amount += _sum_transactions(transactions, type_keys={"b_sur", "e_sur"})
    return amount


def subcon_budget(
    site: dict[str, Any],
    subcon_id: int,
    bucket_key: str,
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
    job_scales: dict[str, str],
) -> Decimal:
    receiving_date = site["receiving_date"]
    amount = ZERO
    for job_key in JOB_BUCKETS[bucket_key]:
        scale_by = job_scales.get(job_key, "unit")
        qty = _job_quantity(site, job_key, scale_by)
        if qty == ZERO:
            continue
        amount += _select_rate(job_key, receiving_date, rate_rows) * qty
    amount += _sum_transactions(transactions, type_keys={"b_sur"}, recipient_id=subcon_id)
    return amount


def subcon_cost(
    site: dict[str, Any],
    assignment: SubconAssignmentRow,
    assignments: list[SubconAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
    job_scales: dict[str, str],
) -> Decimal:
    if assignment.active:
        return site_cost_for_bucket(site, assignment.bucket_key, transactions, rate_rows, job_scales)

    return ZERO


def subcon_paid(transactions: list[TransactionRow], subcon_id: int) -> Decimal:
    paid = _sum_transactions(transactions, type_keys={FE_PAYMENT_TYPE}, recipient_id=subcon_id)
    refunds = _sum_transactions(transactions, type_keys={REFUND_TYPE}, recipient_id=subcon_id)
    return paid - refunds


def scrap_value(site: dict[str, Any], bucket_key: str) -> Decimal:
    if bucket_key != "bmd":
        return ZERO
    return _as_decimal(site.get("scrap_value"))


def subcon_balance(
    site: dict[str, Any],
    assignment: SubconAssignmentRow,
    assignments: list[SubconAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
    job_scales: dict[str, str],
) -> Decimal:
    if assignment.active and site.get("status_key") != COMPLETED_STATUS:
        return ZERO
    return subcon_cost(site, assignment, assignments, transactions, rate_rows, job_scales) - subcon_paid(transactions, assignment.subcon_id) - scrap_value(site, assignment.bucket_key)


def calculate_site_financials(
    site: dict[str, Any],
    assignments: list[SubconAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
    job_scales: dict[str, str],
) -> dict[str, Any]:
    by_subcon: list[dict[str, Any]] = []
    budget = ZERO
    cost = ZERO
    paid = ZERO
    for assignment in assignments:
        row_budget = subcon_budget(site, assignment.subcon_id, assignment.bucket_key, transactions, rate_rows, job_scales)
        row_cost = subcon_cost(site, assignment, assignments, transactions, rate_rows, job_scales)
        row_paid = subcon_paid(transactions, assignment.subcon_id)
        row_balance = subcon_balance(site, assignment, assignments, transactions, rate_rows, job_scales)
        budget += row_budget
        cost += row_cost
        paid += row_paid
        by_subcon.append(
            {
                "assignment_id": assignment.id,
                "subcon_id": assignment.subcon_id,
                "bucket_key": assignment.bucket_key,
                "active": assignment.active,
                "budget": row_budget,
                "cost": row_cost,
                "paid": row_paid,
                "balance": row_balance,
            }
        )

    site_balance = ZERO if site.get("status_key") != COMPLETED_STATUS else cost - paid - scrap_value(site, "bmd")
    return {"budget": budget, "cost": cost, "paid": paid, "balance": site_balance, "subcon_rows": by_subcon}


def calculate_subcon_view(
    site: dict[str, Any],
    subcon_id: int,
    bucket_key: str,
    assignments: list[SubconAssignmentRow],
    transactions: list[TransactionRow],
    rate_rows: list[RateCardRow],
    job_scales: dict[str, str],
) -> dict[str, Decimal]:
    target = next((row for row in assignments if row.subcon_id == subcon_id and row.bucket_key == bucket_key), None)
    if target is None:
        return {"cost": ZERO, "paid": ZERO, "balance": ZERO}
    return {
        "cost": subcon_cost(site, target, assignments, transactions, rate_rows, job_scales),
        "paid": subcon_paid(transactions, subcon_id),
        "balance": subcon_balance(site, target, assignments, transactions, rate_rows, job_scales),
    }
