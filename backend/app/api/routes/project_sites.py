from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project
from app.models.project import Project

router = APIRouter(
    prefix="/api/v1/project",
    tags=["project-sites"]
)


@router.get("/{project_code}/sites")
def get_sites(
    project_code: str,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = db.query(Project).filter(Project.code == project_code).first()
    require(project is not None, "Invalid project")

    policy = resolve_policy_for_project(role, project.id, db)

    rows = db.execute(
        text(f"""
        select *
        from {project.site_schema}.site
        order by id
        """)
    ).mappings().all()

    columns = db.execute(
        text("""
        SELECT
        a.attname AS column_name,
        col_description(a.attrelid,a.attnum) AS label
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid=c.oid
        JOIN pg_namespace n ON c.relnamespace=n.oid
        WHERE n.nspname=:schema
        AND c.relname='site'
        AND a.attnum>0
        AND NOT a.attisdropped
        ORDER BY a.attnum
        """),
        {"schema": project.site_schema}
    ).mappings().all()

    return {
        "data": policy.filter_site_response(rows),
        "field_permissions": policy.permissions,
        "columns": columns
    }
