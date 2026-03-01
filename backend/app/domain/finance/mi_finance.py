from app.domain.finance.rate_repository import get_latest_rate_for_date
from app.domain.finance.mi_calculator import compute_mi_financials

MAST_INSTALLATION_JOB_ID = 1

def compute_financials(site, db):
    if not site.receiving_date:
        return {}

    rate_row = get_latest_rate_for_date(
        job_id=MAST_INSTALLATION_JOB_ID,
        date=site.receiving_date,
        db=db
    )

    rate_value = rate_row.unit_cost if rate_row else 0

    return compute_mi_financials(
        rate_value=rate_value,
        height_value=site.height_m,
        paid_value=site.paid,
        project_id=site.project_id,
        site_id=site.id,
        db=db
    )
