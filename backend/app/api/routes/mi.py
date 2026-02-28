from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.domain.mi.commands import update_site_command
from app.domain.mi.create_command import create_site_command
from app.services.mi_service import get_mi_sites

router = APIRouter(prefix="/api/v1/mi", tags=["mi"])


class MiCreate(BaseModel):
    project_id: int
    ckt_id: str
    customer: str
    receiving_date: date
    height_m: float
    city: str | None = None
    lc: str | None = None


@router.get("/{project_id}")
def get_sites(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_mi_sites(project_id, db)


@router.post("")
def create_site(
    payload: MiCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        new_site = create_site_command(payload, db)
        return {"message": "created", "id": new_site.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=e.args[0])
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to create site")


@router.put("/site/{site_id}")
def update_site(
    site_id: int,
    payload: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        update_site_command(site_id, payload, db)
        return {"message": "updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=e.args[0])
    except Exception:
        raise HTTPException(status_code=400, detail="Update failed")
