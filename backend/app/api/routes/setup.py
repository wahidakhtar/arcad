from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func, text

from app.core.database import engine
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.setup import CreateCEORequest

router = APIRouter(prefix="/setup", tags=["setup"])


@router.post("/create-ceo")
def create_ceo(data: CreateCEORequest):

    with Session(engine) as db:

        user_count = db.scalar(select(func.count()).select_from(User))

        if user_count > 0:
            raise HTTPException(status_code=403, detail="System already initialized")

        user = User(
            name=data.name,
            username=data.username,
            password_hash=get_password_hash(data.password),
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        db.execute(
            text("""
            INSERT INTO schema_core.user_role_assignment
            (user_id, role_id, project_badge_id)
            VALUES (:user_id, 12, NULL)
            """),
            {"user_id": user.id}
        )

        db.commit()

        return {"status": "CEO created"}