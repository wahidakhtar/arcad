from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.schemas.user import PasswordResetRequest, UserCreate, UserOut, UserRoleAssignment, UserUpdate
from app.services import users as user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut], dependencies=[Depends(permission_required("people", "read"))])
def list_users(db: Session = Depends(get_db)):
    return user_service.list_users(db)


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(permission_required("people", "read"))])
def get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_user(db, user_id)


@router.post("", response_model=UserOut, dependencies=[Depends(permission_required("people", "write"))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    return user_service.create_user(db, payload)


@router.patch("/{user_id}", response_model=UserOut, dependencies=[Depends(permission_required("people", "write"))])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    return user_service.update_user(db, user_id, payload)


@router.post("/{user_id}/roles", response_model=UserOut, dependencies=[Depends(permission_required("role", "write"))])
def assign_role(user_id: int, payload: UserRoleAssignment, db: Session = Depends(get_db)):
    return user_service.assign_role(db, user_id, payload)


@router.delete("/{user_id}/roles/{role_id}", response_model=UserOut, dependencies=[Depends(permission_required("role", "write"))])
def remove_role(user_id: int, role_id: int, db: Session = Depends(get_db)):
    return user_service.remove_role(db, user_id, role_id)


@router.patch("/{user_id}/password", status_code=204, dependencies=[Depends(permission_required("people", "write"))])
def reset_password(user_id: int, payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user_service.reset_password(db, user_id, payload.password)
