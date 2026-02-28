from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.fe import FeAssignment, Fe
from app.domain.site_resolver import validate_site_exists


def assign_fe(db: Session, project_id: int, site_id: int, fe_id: int):
    # Validate site exists
    validate_site_exists(db, project_id, site_id)

    # Validate FE exists
    fe = db.query(Fe).filter(Fe.id == fe_id, Fe.is_active == True).first()
    if not fe:
        raise ValueError("Invalid or inactive FE")

    # Validate FE allowed for project
    allowed_ids = [int(x.strip()) for x in fe.allowed_project_ids.split(",") if x.strip()]
    if project_id not in allowed_ids:
        raise ValueError("FE not allowed for this project")

    # Check active assignment for site
    active_assignment = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id,
            FeAssignment.is_active == True
        )
    ).first()

    if active_assignment:
        raise ValueError("Site already has an active FE")

    assignment = FeAssignment(
        project_id=project_id,
        site_id=site_id,
        fe_id=fe_id,
        is_active=True
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


def remove_fe(db: Session, project_id: int, site_id: int, final_fe_cost):
    assignment = db.query(FeAssignment).filter(
        and_(
            FeAssignment.project_id == project_id,
            FeAssignment.site_id == site_id,
            FeAssignment.is_active == True
        )
    ).first()

    if not assignment:
        raise ValueError("No active FE assignment found")

    if final_fe_cost is None:
        raise ValueError("final_fe_cost is required")

    assignment.is_active = False
    assignment.final_fe_cost = final_fe_cost

    db.commit()
    db.refresh(assignment)

    return assignment
