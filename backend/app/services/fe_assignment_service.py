from sqlalchemy.orm import Session
from sqlalchemy import and_
from decimal import Decimal
from app.models.fe import FeAssignment
from app.domain.site_resolver import validate_site_exists


def assign_fe(db: Session, project_id: int, site_id: int, fe_id: int):
    from app.models.fe import Fe
    from app.models.mi import Mi
    from app.domain.finance.mi_finance import compute_financials
    from sqlalchemy import func

    validate_site_exists(db, project_id, site_id)

    site = db.query(Mi).filter(Mi.id == site_id).first()

    fe = db.query(Fe).filter(Fe.id == fe_id, Fe.is_active == True).first()
    if not fe:
        raise ValueError("Invalid or inactive FE")

    financials = compute_financials(site, db)
    site_cost = Decimal(str(financials.get("cost", 0)))

    previous_sum = db.query(func.coalesce(func.sum(FeAssignment.final_fe_cost), 0)).filter(
        FeAssignment.project_id == project_id,
        FeAssignment.site_id == site_id
    ).scalar()

    previous_sum = Decimal(str(previous_sum or 0))
    remaining = site_cost - previous_sum

    if remaining <= 0:
        raise ValueError("No remaining cost available")

    assignment = FeAssignment(
        project_id=project_id,
        site_id=site_id,
        fe_id=fe_id,
        final_fe_cost=remaining,
        is_active=True
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def remove_fe(db: Session, project_id: int, site_id: int, final_fe_cost):
    validate_site_exists(db, project_id, site_id)

    active = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id,
            FeAssignment.is_active == True
        )
    ).first()

    if not active:
        raise ValueError("No active FE")

    active.final_fe_cost = Decimal(str(final_fe_cost))
    active.is_active = False

    db.commit()
    db.refresh(active)
    return active
