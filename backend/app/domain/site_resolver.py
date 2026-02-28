from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.project import Project


def validate_site_exists(db: Session, project_id: int, site_id: int):
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise ValueError("Invalid project_id")

    schema = project.site_schema

    query = text(f"SELECT id FROM {schema}.site WHERE id = :site_id")

    result = db.execute(query, {"site_id": site_id}).fetchone()

    if not result:
        raise ValueError("Site does not exist in specified project")

    return True
