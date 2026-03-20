from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.core import Project
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

    if payload.label is not None and payload.label:
        user.label = payload.label
    if payload.aadhaar is not None:
        user.aadhaar = payload.aadhaar or None
    if payload.upi is not None:
        user.upi = payload.upi or None
    if payload.ctc is not None:
        user.ctc = payload.ctc or None
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

    # One-department-per-user enforcement
    existing_assignments = db.execute(
        select(UserRole, Role).join(Role, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)
    ).all()
    if existing_assignments:
        existing_depts = {r.dept_key for _, r in existing_assignments}
        if payload.dept_key not in existing_depts:
            existing_dept = next(iter(existing_depts))
            raise HTTPException(
                status_code=403,
                detail=f"User already belongs to {existing_dept} department. Cross-department role assignment is not allowed.",
            )

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


def get_available_roles(db: Session, user_id: int) -> list[dict]:
    """Return role combinations currently assignable for the given user.

    Rules:
    - Never: acc l3, hr l2, hr l3, fo l2, fo l3 (invalid combos per schema_core.roles)
    - Never: mgmt l3 (reserved, not UI-assignable)
    - acc l2 / acc l1: only if no other user currently holds that role (global uniqueness)
    - hr l1: only if no other user currently holds hr l1
    - ops l3: per project — only if no other user holds ops l3 for that specific project
    - All other combos freely assignable
    Returns list of {dept_key, level_key, project_id (None or int), role_id, label}
    """
    # Load all roles that actually exist in the DB
    all_roles = db.execute(select(Role)).scalars().all()

    # Hard exclusions
    EXCLUDED = {
        ("acc", "l3"), ("hr", "l2"), ("hr", "l3"),
        ("fo", "l2"), ("fo", "l3"), ("mgmt", "l3"),
    }

    # Singleton roles: only one holder allowed system-wide (excluding the current user)
    singleton_keys = {("acc", "l2"), ("acc", "l1"), ("hr", "l1")}
    # Check which singletons are already taken by someone else
    taken_singletons: set[tuple[str, str]] = set()
    for dept_key, level_key in singleton_keys:
        role = next((r for r in all_roles if r.dept_key == dept_key and r.level_key == level_key), None)
        if role is None:
            continue
        holder = db.execute(
            select(UserRole).where(UserRole.role_id == role.id, UserRole.user_id != user_id)
        ).first()
        if holder is not None:
            taken_singletons.add((dept_key, level_key))

    # ops l3: per-project uniqueness — find which project_ids already have ops l3 assigned (excluding current user)
    ops_l3_role = next((r for r in all_roles if r.dept_key == "ops" and r.level_key == "l3"), None)
    taken_ops_l3_projects: set[int] = set()
    if ops_l3_role is not None:
        assignments = db.execute(
            select(UserRole).where(UserRole.role_id == ops_l3_role.id, UserRole.user_id != user_id)
        ).scalars().all()
        taken_ops_l3_projects = {a.project_id for a in assignments if a.project_id is not None}

    # One-department filter: if the target user already has roles, restrict to their dept
    target_user_roles = db.execute(
        select(UserRole, Role).join(Role, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)
    ).all()
    allowed_depts: Optional[set[str]] = None
    if target_user_roles:
        allowed_depts = {role.dept_key for _, role in target_user_roles}

    # Load active projects only (for ops/fo scoping)
    projects = db.execute(select(Project).where(Project.active.is_(True))).scalars().all()

    result: list[dict] = []
    for role in all_roles:
        dk, lk = role.dept_key, role.level_key
        if (dk, lk) in EXCLUDED:
            continue
        if (dk, lk) in taken_singletons:
            continue
        # One-department filter
        if allowed_depts is not None and dk not in allowed_depts:
            continue

        if dk in {"ops", "fo"}:
            # Scoped per project
            for project in projects:
                if dk == "ops" and lk == "l3" and project.id in taken_ops_l3_projects:
                    continue
                result.append({
                    "role_id": role.id,
                    "dept_key": dk,
                    "level_key": lk,
                    "label": role.label,
                    "project_id": project.id,
                    "project_label": project.label,
                    "project_key": project.key,
                })
        else:
            result.append({
                "role_id": role.id,
                "dept_key": dk,
                "level_key": lk,
                "label": role.label,
                "project_id": None,
                "project_label": None,
                "project_key": None,
            })

    return result


def reset_password(db: Session, user_id: int, password: str) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.hash = hash_password(password)
    db.commit()
