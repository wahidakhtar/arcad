from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.authz.dependencies import get_role
from app.authz.guard import require
from app.authz.policy_resolver import resolve_policy_for_project
from app.models.project import Project


router = APIRouter(
    prefix="/project",
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

    policy = resolve_policy_for_project(role, project.badge_id, db)

    rows = db.execute(
        text(f"""
        SELECT *
        FROM {project.site_schema}.site
        ORDER BY id
        """)
    ).mappings().all()

    columns = db.execute(
        text(f"""
        SELECT
            a.attname AS column_name,
            col_description(a.attrelid,a.attnum) AS label,
            (a.attname LIKE '%_badge_id') AS is_badge,
            COALESCE(o.column_order, 999) AS column_order
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN {project.site_schema}.project_column_order o
               ON o.column_name = a.attname
        WHERE n.nspname = :schema
        AND c.relname = 'site'
        AND a.attnum > 0
        AND NOT a.attisdropped
        ORDER BY column_order, a.attnum
        """),
        {"schema": project.site_schema}
    ).mappings().all()

    allowed_columns = [
        c for c in columns
        if c["column_name"] == "id" or c["column_name"] in policy.table_fields
    ]

    return {
        "data": policy.filter_table_response(rows),
        "field_permissions": policy.permissions,
        "can_add_site": policy.can_add_site(),
        "columns": allowed_columns,
    }


@router.get("/{project_code}/site/{site_id}")
def get_site(
    project_code: str,
    site_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db),
):

    project = db.query(Project).filter(Project.code == project_code).first()
    require(project is not None, "Invalid project")

    policy = resolve_policy_for_project(role, project.badge_id, db)
    require(policy.can_open_detail())

    row = db.execute(
        text(f"""
        SELECT *
        FROM {project.site_schema}.site
        WHERE id = :site_id
        """),
        {"site_id": site_id}
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Site not found")

    return {
        "data": policy.filter_detail_response(row)
    }