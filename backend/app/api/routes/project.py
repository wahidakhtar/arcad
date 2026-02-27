from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.project import Project

router = APIRouter(prefix="/api/v1/project", tags=["project"])

@router.get("/my")
def get_my_project(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project_list = db.query(Project).filter(Project.is_active == True).all()

    return [
        {
            "id": p.id,
            "code": p.code,
            "name": p.name,
        }
        for p in project_list
    ]

