"""remove FO completely

Revision ID: 3971358f45db
Revises: b8edd77ca145
Create Date: 2026-03-24 15:15:38.251601
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "3971358f45db"
down_revision = "b8edd77ca145"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM schema_core.role_tags
        WHERE role_id = 10
        """
    )

    op.execute(
        """
        DELETE FROM schema_hr.user_roles
        WHERE role_id = 10
        """
    )

    op.execute(
        """
        DELETE FROM schema_auth.refresh_tokens
        WHERE session_id IN (
            SELECT id
            FROM schema_auth.sessions
            WHERE user_id IN (18, 19, 20)
        )
        """
    )

    op.execute(
        """
        DELETE FROM schema_auth.sessions
        WHERE user_id IN (18, 19, 20)
        """
    )

    op.execute(
        """
        DELETE FROM schema_hr.users
        WHERE id IN (
            SELECT u.id
            FROM schema_hr.users u
            LEFT JOIN schema_hr.user_roles ur ON ur.user_id = u.id
            WHERE u.id IN (18, 19, 20)
            GROUP BY u.id
            HAVING COUNT(ur.id) = 0
        )
        """
    )

    op.execute(
        """
        DELETE FROM schema_hr.roles
        WHERE id = 10
        """
    )

    op.execute(
        """
        DELETE FROM schema_core.badges
        WHERE type = 'department' AND label = 'FO'
        """
    )

    result = op.get_bind().execute(
        sa.text("SELECT 1 FROM schema_hr.roles WHERE id = 10")
    ).fetchall()

    if result:
        raise Exception("FO role still exists")


def downgrade() -> None:
    pass
