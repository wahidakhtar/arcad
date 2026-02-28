from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.fe_assignment_service import assign_fe, remove_fe
from app.models.fe import FeAssignment

router = APIRouter(prefix="/api/v1/fe", tags=["fe"])


class AssignFeRequest(BaseModel):
    project_id: int
    site_id: int
    fe_id: int


class RemoveFeRequest(BaseModel):
    project_id: int
    site_id: int
    final_fe_cost: float


@router.post("/assign")
def assign_fe_route(
    payload: AssignFeRequest,
    db: Session = Depends(get_db),
):
    try:
        return assign_fe(db, payload.project_id, payload.site_id, payload.fe_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/remove")
def remove_fe_route(
    payload: RemoveFeRequest,
    db: Session = Depends(get_db),
):
    try:
        return remove_fe(
            db,
            payload.project_id,
            payload.site_id,
            payload.final_fe_cost,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
