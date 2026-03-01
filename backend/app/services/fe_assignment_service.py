from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from decimal import Decimal
from app.models.fe import FeAssignment
from app.domain.site_resolver import validate_site_exists


def assign_fe(db: Session, project_id: int, site_id: int, fe_id: int):
    from app.models.fe import Fe
    from app.models.mi import Mi
    from app.models.fe import Finance
    from app.domain.finance.mi_finance import compute_financials

    try:
        validate_site_exists(db, project_id, site_id)

        site = db.query(Mi).filter(Mi.id == site_id).first()

        fe = db.query(Fe).filter(Fe.id == fe_id, Fe.is_active == True).first()
        if not fe:
            raise ValueError("Invalid or inactive FE")

        financials = compute_financials(site, db)
        total_cost = Decimal(str(financials.get("cost", 0)))

        # Sum of CLOSED FE settlements
        closed_sum = db.query(
            func.coalesce(func.sum(FeAssignment.final_fe_cost), 0)
        ).filter(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id,
            FeAssignment.is_active == False
        ).scalar()

        closed_sum = Decimal(str(closed_sum or 0))

        # Unapproved & executed surcharge of CLOSED FEs
        unapproved_surcharge = db.query(
            func.coalesce(func.sum(Finance.amount), 0)
        ).filter(
            Finance.project_id == project_id,
            Finance.site_id == site_id,
            Finance.type == "surcharge",
            Finance.state == "executed",
            Finance.approval == False,
            Finance.fe_id.in_(
                db.query(FeAssignment.fe_id).filter(
                    FeAssignment.project_id == project_id,
                    FeAssignment.site_id == site_id,
                    FeAssignment.is_active == False
                )
            )
        ).scalar()

        unapproved_surcharge = Decimal(str(unapproved_surcharge or 0))

        remaining = total_cost - closed_sum + unapproved_surcharge

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

    except Exception:
        db.rollback()
        raise


def remove_fe(db: Session, project_id: int, site_id: int, final_fe_cost):
    try:
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

    except Exception:
        db.rollback()
        raise
