from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from app.authz.models import UserRole, RoleSet


def resolve_user_role(user_id: int, db: Session):

    role_rows = db.execute(
        text("""
            SELECT
                ura.role_id,
                ura.project_badge_id,
                p.badge_key AS project_code,
                r.dept_badge_id AS department_badge_id,
                d.badge_key AS department_code,
                r.level_badge_id AS level_badge_id,
                l.badge_key AS level_code
            FROM schema_core.user_role_assignment ura
            LEFT JOIN schema_core.badge p ON p.id = ura.project_badge_id
            JOIN schema_core.role r ON r.id = ura.role_id
            JOIN schema_core.badge d ON d.id = r.dept_badge_id
            JOIN schema_core.badge l ON l.id = r.level_badge_id
            WHERE ura.user_id = :uid
        """),
        {"uid": user_id},
    ).fetchall()

    role_sets = [
        RoleSet(
            role_id=row.role_id,
            project_id=row.project_badge_id,
            project_code=row.project_code,
            department_id=row.department_badge_id,
            department_code=row.department_code,
            level_id=row.level_badge_id,
            level_code=row.level_code,
        )
        for row in role_rows
    ]

    role_ids = [r.role_id for r in role_sets]

    permissions = []

    if role_ids:
        perm_rows = db.execute(
            text("""
                SELECT DISTINCT op_key
                FROM schema_core.operation_permission
                WHERE role_id IN :role_ids
            """).bindparams(
                bindparam("role_ids", expanding=True)
            ),
            {"role_ids": role_ids},
        ).fetchall()

        permissions = [row.op_key for row in perm_rows]

    user_role = UserRole(role_sets=role_sets)
    user_role.permissions = set(permissions)

    # useful for fast checks
    user_role.project_badges = {
        r.project_id for r in role_sets if r.project_id
    }

    return user_role, permissions