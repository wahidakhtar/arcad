from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.hr import Role, User, UserRole
from app.schemas.auth import RoleEntry
from app.schemas.user import UserCreate, UserOut, UserRoleAssignment, UserUpdate

DEPARTMENT_ROLE_MAP = {
    "management": "mgmt",
    "accounts": "acc",
    "operations": "ops",
    "hr": "hr",
    "fo": "fo",
    "field": "fo",
}


def list_users(db: Session) -> list[UserOut]:
    users = db.execute(select(User).order_by(User.active.desc(), User.label.asc())).scalars().all()
    role_rows = db.execute(select(UserRole, Role).join(Role, Role.id == UserRole.role_id)).all()
    role_map: dict[int, list[RoleEntry]] = {}
    for user_role, role in role_rows:
        role_map.setdefault(user_role.user_id, []).append(
            RoleEntry(id=user_role.id, key=role.key, label=role.label, dept_key=role.dept_key, level_key=role.level_key, project_id=user_role.project_id)
        )
    return [
        UserOut(id=user.id, username=user.username, label=user.label, aadhaar=user.aadhaar, upi=user.upi, ctc=user.ctc, active=user.active, roles=role_map.get(user.id, []))
        for user in users
    ]


def get_user(db: Session, user_id: int) -> UserOut:
    match = next((row for row in list_users(db) if row.id == user_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="User not found")
    return match


def create_user(db: Session, payload: UserCreate) -> UserOut:
    existing = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        label=payload.label,
        hash=hash_password(payload.password),
        aadhaar=payload.aadhaar,
        upi=payload.upi,
        ctc=payload.ctc,
        active=payload.active,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()

    roles: list[RoleEntry] = []
    if payload.department:
        department_key = DEPARTMENT_ROLE_MAP.get(payload.department.strip().lower())
        if department_key is None:
            raise HTTPException(status_code=400, detail="Unsupported department")

        role = db.execute(
            select(Role)
            .where(Role.dept_key == department_key, Role.level_key == "l1")
            .order_by(Role.global_scope.desc(), Role.id.asc())
        ).scalar_one_or_none()
        if role is None:
            raise HTTPException(status_code=400, detail="No default role configured for department")

        db.add(UserRole(user_id=user.id, role_id=role.id, project_id=None))
        roles.append(
            RoleEntry(
                id=role.id,
                key=role.key,
                label=role.label,
                dept_key=role.dept_key,
                level_key=role.level_key,
                project_id=None,
            )
        )

    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, username=user.username, label=user.label, aadhaar=user.aadhaar, upi=user.upi, ctc=user.ctc, active=user.active, roles=roles)


def update_user(db: Session, user_id: int, payload: UserUpdate) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.username is not None and payload.username != user.username:
        existing = db.execute(select(User).where(User.username == payload.username, User.id != user_id)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = payload.username

    if payload.aadhaar is not None:
        user.aadhaar = payload.aadhaar or None
    if payload.upi is not None:
        user.upi = payload.upi or None
    if payload.active is not None:
        user.active = payload.active

    db.commit()
    return get_user(db, user_id)


def assign_role(db: Session, user_id: int, payload: UserRoleAssignment) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.execute(
        select(Role).where(Role.dept_key == payload.dept_key, Role.level_key == payload.level_key).order_by(Role.global_scope.desc(), Role.id.asc())
    ).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=400, detail="Role not found")

    needs_project = payload.dept_key in {"ops", "fo"}
    project_id = payload.project_id if needs_project else None
    if needs_project and project_id is None:
        raise HTTPException(status_code=400, detail="Project is required for this department")

    existing = db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id, UserRole.project_id == project_id)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Role already assigned")

    db.add(UserRole(user_id=user_id, role_id=role.id, project_id=project_id))
    db.commit()
    return get_user(db, user_id)


def remove_role(db: Session, user_id: int, user_role_id: int) -> UserOut:
    assignment = db.get(UserRole, user_role_id)
    if assignment is None or assignment.user_id != user_id:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    db.delete(assignment)
    db.commit()
    return get_user(db, user_id)


def reset_password(db: Session, user_id: int, password: str) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.hash = hash_password(password)
    db.commit()
