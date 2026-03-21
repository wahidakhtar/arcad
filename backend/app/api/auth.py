from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import PermissionDenied
from app.core.security import decode_token
from app.models.core import FieldPermission, Project, RoleTag, Tag
from app.models.hr import Role, User, UserRole

security = HTTPBearer(auto_error=False)

LEVEL_ORDER: dict[str, int] = {"l1": 1, "l2": 2, "l3": 3}


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
    # (role_id, tag) → (read, write) — loaded once per request
    permission_map: dict[tuple[int, str], tuple[bool, bool]] = field(default_factory=dict)
    # (field_key, dept_key) → level_key (None = all levels) — loaded once per request
    field_write_map: dict[tuple[str, str], Optional[str]] = field(default_factory=dict)

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

    # Load all permission tags for this user's roles — join role_tags → tags for tag string
    role_ids = [r.role_id for r in roles]
    perm_rows = db.execute(
        select(RoleTag, Tag).join(Tag, Tag.id == RoleTag.tag_id).where(RoleTag.role_id.in_(role_ids))
    ).all()
    permission_map: dict[tuple[int, str], tuple[bool, bool]] = {
        (rt.role_id, tg.tag): (rt.read, rt.write) for rt, tg in perm_rows
    }

    # Load all field permissions for this user's dept_keys in one query
    dept_keys = list({r.dept_key for r in roles})
    fp_rows = db.execute(
        select(FieldPermission).where(FieldPermission.dept_key.in_(dept_keys))
    ).scalars().all()
    field_write_map: dict[tuple[str, str], Optional[str]] = {
        (fp.field_key, fp.dept_key): fp.level_key for fp in fp_rows
    }

    return UserContext(
        user_id=user.id,
        username=user.username,
        label=user.label,
        active=user.active,
        roles=roles,
        permission_map=permission_map,
        field_write_map=field_write_map,
    )


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


def check_permission(user: UserContext, project_key: Optional[str], tag: str, action: str, db: Session) -> bool:
    for role in user.roles:
        if project_key is not None and not role.global_scope:
            current_project_key = _project_key_for_id(db, role.project_id)
            if current_project_key != project_key:
                continue

        perm = user.permission_map.get((role.role_id, tag))
        if perm is None:
            continue
        read_ok, write_ok = perm
        if action == "read" and read_ok:
            return True
        if action == "write" and write_ok:
            return True
    return False


def check_field_write_scope(user: UserContext, field_name: str) -> bool:
    for role in user.roles:
        # Amendment 1: superuser bypass scoped to mgmtl3 only
        if role.role_key == "mgmtl3":
            return True

        map_key = (field_name, role.dept_key)
        if map_key not in user.field_write_map:
            continue

        required_level = user.field_write_map[map_key]  # None or 'l1'/'l2'/'l3'
        if required_level is None:
            return True  # All levels of this dept can write
        if LEVEL_ORDER.get(role.level_key, 0) >= LEVEL_ORDER.get(required_level, 0):
            return True  # User level meets or exceeds minimum requirement

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
    if not check_permission(user, project_key, tag, action, db):
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


def build_tag_map(user: UserContext) -> dict[str, dict[str, bool]]:
    """Compute union of permission tags across all user roles."""
    tag_map: dict[str, dict[str, bool]] = {}
    for (_, tag), (read_ok, write_ok) in user.permission_map.items():
        if tag not in tag_map:
            tag_map[tag] = {"read": False, "write": False}
        if read_ok:
            tag_map[tag]["read"] = True
        if write_ok:
            tag_map[tag]["write"] = True
    return tag_map


def build_project_keys(user: UserContext, db: Session) -> list[str]:
    """Return project keys accessible to the user."""
    if any(role.global_scope for role in user.roles):
        rows = db.execute(select(Project).where(Project.active.is_(True))).scalars().all()
        return [p.key for p in rows]
    project_ids = {role.project_id for role in user.roles if role.project_id is not None}
    if not project_ids:
        return []
    rows = db.execute(select(Project).where(Project.id.in_(project_ids), Project.active.is_(True))).scalars().all()
    return [p.key for p in rows]


def user_project_ids(user: UserContext) -> Optional[list[int]]:
    """Return project ID list for project-scoped users, or None for global-scope."""
    if any(role.global_scope for role in user.roles):
        return None
    return list({role.project_id for role in user.roles if role.project_id is not None})
