from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.project import Project
from app.authz.guard import require
from app.authz.policies.mi_policy import MiPolicy


def resolve_policy_for_project(role, project_id: int, db: Session):
    project = db.query(Project).filter(Project.id == project_id).first()
    require(project is not None, "Invalid project")

    role_set = role.get_for_project(project.code)
    require(role_set is not None, "No role for this project")

    # Project → Policy mapping (extendable)
    if project.code == "mi":
        return MiPolicy(role_set)

    # Future:
    # if project.code == "md": return MdPolicy(role_set)
    # if project.code == "ma": return MaPolicy(role_set)

    raise HTTPException(status_code=403, detail="No policy for this project")
