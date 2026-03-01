from sqlalchemy.orm import Session
from sqlalchemy import text
from app.authz.models import UserRole, RoleSet


def resolve_user_role(user_id: int, db: Session) -> UserRole:
    rows = db.execute(
        text("""
            SELECT 
                ura.project_badge_id,
                p.badge_key AS project_code,
                ura.department_badge_id,
                d.badge_key AS department_code,
                ura.level_badge_id,
                l.badge_key AS level_code
            FROM schema_core.user_role_assignment ura
            JOIN schema_core.badge p ON p.id = ura.project_badge_id
            JOIN schema_core.badge d ON d.id = ura.department_badge_id
            JOIN schema_core.badge l ON l.id = ura.level_badge_id
            WHERE ura.user_id = :uid
        """),
        {"uid": user_id},
    ).fetchall()

    role_sets = [
        RoleSet(
            project_id=row.project_badge_id,
            project_code=row.project_code,
            department_id=row.department_badge_id,
            department_code=row.department_code,
            level_id=row.level_badge_id,
            level_code=row.level_code,
        )
        for row in rows
    ]

    return UserRole(role_sets)
