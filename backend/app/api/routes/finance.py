from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.services.finance_service import create_finance_entry, update_finance_state
from app.models.fe import FinanceTypeEnum, FinanceStateEnum

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


class CreateFinanceRequest(BaseModel):
    project_id: int
    site_id: int
    fe_id: Optional[int] = None
    type: FinanceTypeEnum
    amount: float
    approval: bool = False


class ExecuteFinanceRequest(BaseModel):
    execution_date: str


@router.post("/")
def create_finance(
    payload: CreateFinanceRequest,
    db: Session = Depends(get_db),
):
    try:
        return create_finance_entry(
            db=db,
            project_id=payload.project_id,
            site_id=payload.site_id,
            fe_id=payload.fe_id,
            type=payload.type,
            state=FinanceStateEnum.requested,
            amount=payload.amount,
            approval=payload.approval,
            execution_date=None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{finance_id}/execute")
def execute_finance(
    finance_id: int,
    payload: ExecuteFinanceRequest,
    db: Session = Depends(get_db),
):
    try:
        return update_finance_state(
            db,
            finance_id,
            FinanceStateEnum.executed,
            payload.execution_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
