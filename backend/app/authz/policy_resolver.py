from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy import text

from app.models.project import Project
from app.authz.guard import require
from app.authz.policies.project_policy import ProjectPolicy


def resolve_policy_for_project(role, project_badge_id: int, db: Session):
    """
    Authorization should work with badge ids.
    Project table is only used to resolve the schema in the last step.
    """

    row = db.execute(
        text("""
        SELECT
            p.id AS project_id,
            p.code,
            p.site_schema
        FROM schema_core.project p
        JOIN schema_core.badge b
          ON b.badge_key = p.code
        WHERE b.id = :badge_id
        """),
        {"badge_id": project_badge_id}
    ).mappings().first()

    require(row is not None, "Invalid project")

    role_set = role.get_for_project(row["code"])
    require(role_set is not None, "No role for this project")

    project_id = row["project_id"]
    project_code = row["code"]

    # Mast-type projects share the same policy
    if project_code in ["mi", "md", "ma", "mc", "bb"]:
        return ProjectPolicy(role_set, project_id, db)

    raise HTTPException(status_code=403, detail="No policy for this project")