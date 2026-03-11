from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.authz.dependencies import get_role
from app.models.project import Project


router = APIRouter(
    prefix="/project",
    tags=["project"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/my")
def get_my_projects(
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    # Only users with project_read permission can see projects
    if "project_read" not in getattr(role, "permissions", set()):
        return []

    # Global access if any role assignment has project_id NULL
    for rs in role.role_sets:
        if rs.project_id is None:
            projects = db.query(Project).all()

            return [
                {"id": p.id, "code": p.code, "name": p.name}
                for p in projects
            ]

    # Otherwise limit to assigned projects
    project_codes = list({
        rs.project_code
        for rs in role.role_sets
        if rs.project_code
    })

    if not project_codes:
        return []

    projects = (
        db.query(Project)
        .filter(Project.code.in_(project_codes))
        .all()
    )

    return [
        {"id": p.id, "code": p.code, "name": p.name}
        for p in projects
    ]


@router.get("")
def list_projects(
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    rows = db.execute(
        text("""
        SELECT
            b.id AS badge_id,
            p.code,
            p.name
        FROM schema_core.project p
        JOIN schema_core.badge b
            ON b.badge_key = p.code
        ORDER BY p.id
        """)
    ).mappings().all()

    return [
        {
            "id": r["badge_id"],
            "code": r["code"],
            "name": r["name"]
        }
        for r in rows
    ]