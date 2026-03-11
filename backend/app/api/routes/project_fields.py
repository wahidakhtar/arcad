from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.project import Project

router = APIRouter(prefix="/project", tags=["project-fields"])


@router.get("/{project_code}/fields")
def get_fields(project_code: str, db: Session = Depends(get_db)):

    project = db.query(Project).filter(Project.code == project_code).first()
    if not project:
        return []

    rows = db.execute(
        text("""
        SELECT
            column_name,
            column_name as label
        FROM information_schema.columns
        WHERE table_schema = :schema
        AND table_name = 'site'
        AND column_name NOT IN ('id','project_id')
        ORDER BY ordinal_position
        """),
        {"schema": project.site_schema}
    ).mappings().all()

    return rows
