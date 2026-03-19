from __future__ import annotations

from typing import Optional
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import PermissionDenied
from app.core.security import decode_token
from app.models.core import PermissionTag, Project
from app.models.hr import Role, User, UserRole

security = HTTPBearer(auto_error=False)

ROLE_ACTION_RULES: dict[str, dict[str, set[str]]] = {
    "mgmt": {"read": {"project", "user", "subproject", "role", "site", "field", "transaction", "billing", "rate", "update"}, "write": {"project", "user", "subproject", "role", "site", "field", "transaction", "billing", "rate", "update"}},
    "acc": {"read": {"project", "subproject", "site", "field", "transaction", "billing", "rate", "update"}, "write": {"transaction", "billing", "rate", "update"}},
    "ops": {"read": {"project", "subproject", "site", "field", "transaction", "update"}, "write": {"subproject", "site", "field", "transaction", "update"}},
    "hr": {"read": {"user"}, "write": {"user"}},
    "fo": {"read": {"field", "transaction", "site", "update"}, "write": {"transaction"}},
}
FIELD_WRITE_SCOPE: dict[str, set[str]] = {
    "ops": {
        "receiving_date", "customer", "height", "address", "city", "state_id", "lc", "permission_date", "edd",
        "followup_date", "completion_date", "visit_date", "outcome", "dismantle_date", "scrap_value", "audit_date",
        "mpaint", "mnbr", "arr", "ep", "ec", "cm_date",
    },
    "acc": {"po_number", "invoice_number", "po_status_id", "invoice_status_id", "doc_status_id", "wcc_status_id", "fsr_status_id", "report_status_id"},
}


@dataclass
class RoleContext:
    role_id: int
    role_key: str
    role_label: str
    dept_key: str
    level_key: str
    global_scope: bool
    project_id: Optional[int]


@dataclass
class UserContext:
    user_id: int
    username: str
    label: str
    active: bool
    roles: list[RoleContext]

    @property
    def is_fo(self) -> bool:
        return any(role.dept_key == "fo" for role in self.roles)


def _load_user_context(db: Session, user_id: int) -> UserContext:
    user = db.get(User, user_id)
    if user is None or not user.active:
        raise HTTPException(status_code=401, detail="Inactive or missing user")

    rows = db.execute(
        select(UserRole, Role).join(Role, Role.id == UserRole.role_id).where(UserRole.user_id == user_id)
    ).all()
    roles = [
        RoleContext(
            role_id=role.id,
            role_key=role.key,
            role_label=role.label,
            dept_key=role.dept_key,
            level_key=role.level_key,
            global_scope=role.global_scope,
            project_id=user_role.project_id,
        )
        for user_role, role in rows
    ]
    return UserContext(user_id=user.id, username=user.username, label=user.label, active=user.active, roles=roles)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserContext:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    payload = decode_token(credentials.credentials)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    return _load_user_context(db, user_id)


def _project_key_for_id(db: Session, project_id: Optional[int]) -> Optional[str]:
    if project_id is None:
        return None
    project = db.get(Project, project_id)
    return None if project is None else project.key


def check_permission(roles: list[RoleContext], project_key: Optional[str], tag: str, action: str, db: Session) -> bool:
    for role in roles:
        if project_key is not None and not role.global_scope:
            current_project_key = _project_key_for_id(db, role.project_id)
            if current_project_key != project_key:
                continue

        rule = ROLE_ACTION_RULES.get(role.dept_key, {})
        if tag not in rule.get(action, set()):
            continue

        permission = db.execute(
            select(PermissionTag).where(PermissionTag.role_id == role.role_id, PermissionTag.tag == tag)
        ).scalar_one_or_none()
        if permission is None:
            continue
        if action == "read" and permission.read:
            return True
        if action == "write" and permission.write:
            return True
    return False


def check_field_write_scope(user: UserContext, field_name: str) -> bool:
    for role in user.roles:
        if role.dept_key == "mgmt":
            return True
        if field_name in FIELD_WRITE_SCOPE.get(role.dept_key, set()):
            return True
    return False


def ensure_permission(
    user: UserContext,
    db: Session,
    *,
    project_key: Optional[str],
    tag: str,
    action: str,
    field_name: Optional[str] = None,
) -> None:
    if not check_permission(user.roles, project_key, tag, action, db):
        raise PermissionDenied(f"{action} access denied for {tag}")
    if action == "write" and field_name is not None and not check_field_write_scope(user, field_name):
        raise PermissionDenied(f"Write denied for field {field_name}")


def permission_required(tag: str, action: str, project_key_getter=None, field_name: Optional[str] = None):
    def dependency(
        user: UserContext = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> UserContext:
        project_key = project_key_getter(user, db) if project_key_getter else None
        try:
            ensure_permission(user, db, project_key=project_key, tag=tag, action=action, field_name=field_name)
        except PermissionDenied as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        return user

    return dependency
