from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.authz.dependencies import get_role
from app.core.security import get_password_hash

from app.models.user import User


router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)]
)


def require_permission(role, permission: str):
    if permission not in role.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")


@router.get("")
def list_users(
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    users = db.query(User).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "is_active": u.is_active
        }
        for u in users
    ]


@router.get("/roles")
def list_roles(
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    rows = db.execute(
        text("""
        SELECT
            r.id,
            d.description AS department,
            l.description AS level
        FROM schema_core.role r
        JOIN schema_core.badge d ON r.dept_badge_id = d.id
        JOIN schema_core.badge l ON l.id = r.level_badge_id
        ORDER BY department, level
        """)
    ).mappings().all()

    return [
        {
            "id": r["id"],
            "department": r["department"],
            "level": r["level"]
        }
        for r in rows
    ]


@router.get("/{user_id}")
def get_user(
    user_id: int,
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    roles = db.execute(
        text("""
        SELECT
            ura.role_id,
            ura.project_badge_id,
            d.description AS department,
            l.description AS level,
            p.description AS project
        FROM schema_core.user_role_assignment ura
        JOIN schema_core.role r ON r.id = ura.role_id
        JOIN schema_core.badge d ON d.id = r.dept_badge_id
        JOIN schema_core.badge l ON l.id = r.level_badge_id
        LEFT JOIN schema_core.badge p ON p.id = ura.project_badge_id
        WHERE ura.user_id = :user_id
        """),
        {"user_id": user_id}
    ).mappings().all()

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "is_active": user.is_active,
        "roles": roles
    }


@router.post("")
def create_user(
    name: str = Body(...),
    username: str = Body(...),
    password: str = Body(...),
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    existing = db.query(User).filter(User.username == username).first()

    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        name=name,
        username=username,
        password_hash=get_password_hash(password),
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"id": user.id}


@router.post("/{user_id}/roles")
def assign_role(
    user_id: int,
    role_id: int = Body(...),
    project_badge_id: int | None = Body(None),
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    try:
        db.execute(
            text("""
            INSERT INTO schema_core.user_role_assignment
            (user_id, role_id, project_badge_id)
            VALUES (:user_id, :role_id, :project_badge_id)
            """),
            {
                "user_id": user_id,
                "role_id": role_id,
                "project_badge_id": project_badge_id
            }
        )

        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Role constraint violation")

    return {"status": "ok"}


@router.delete("/{user_id}/roles/{role_id}")
def remove_role(
    user_id: int,
    role_id: int,
    project_badge_id: int | None = None,
    role=Depends(get_role),
    db: Session = Depends(get_db)
):

    require_permission(role, "user_manage")

    db.execute(
        text("""
        DELETE FROM schema_core.user_role_assignment
        WHERE user_id = :user_id
        AND role_id = :role_id
        AND (
            project_badge_id = :project_badge_id
            OR (:project_badge_id IS NULL AND project_badge_id IS NULL)
        )
        """),
        {
            "user_id": user_id,
            "role_id": role_id,
            "project_badge_id": project_badge_id
        }
    )

    db.commit()

    return {"status": "removed"}