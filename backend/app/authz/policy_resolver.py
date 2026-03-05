from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.authz.guard import require
from app.authz.policies.project_policy import ProjectPolicy


def resolve_policy_for_project(role, project_id: int, db: Session):

    project = db.query(Project).filter(Project.id == project_id).first()
    require(project is not None, "Invalid project")

    role_set = role.get_for_project(project.code)
    require(role_set is not None, "No role for this project")

    # All mast-type projects use the same policy
    if project.code in ["mi","md","ma","mc","bb"]:
        return ProjectPolicy(role_set, project_id, db)

    raise HTTPException(status_code=403, detail="No policy for this project")
