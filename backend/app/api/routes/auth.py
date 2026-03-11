from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest
from app.api.dependencies.auth import get_current_user
from app.authz.resolver import resolve_user_role

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == payload.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username
        }
    }


@router.get("/me")
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):

    role, permissions = resolve_user_role(current_user.id, db)

    roles = [
        {
            "project": rs.project_code,
            "department": rs.department_code,
            "level": rs.level_code,
        }
        for rs in role.role_sets
    ]

    return {
        "id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "roles": roles,
        "permissions": permissions
    }