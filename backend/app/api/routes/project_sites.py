from fastapi import APIRouter, Depends, HTTPException
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

    return {
        "data": policy.filter_site_response(rows),
        "capabilities": {
            "can_open_detail": policy.can_open_detail(),
            "can_edit_site": policy.can_edit_site(),
            "can_create_site": policy.can_create_site()
        }
    }
