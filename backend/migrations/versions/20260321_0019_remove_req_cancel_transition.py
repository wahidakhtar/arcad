"""remove_req_cancel_transition: delete req→cancel row from badge_transitions if present

Revision ID: 20260321_0019
Revises: 20260321_0018
Create Date: 2026-03-21
"""
from __future__ import annotations

from alembic import op

revision = "20260321_0019"
down_revision = "20260321_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM schema_acc.badge_transitions
        WHERE from_id = (SELECT id FROM schema_core.badges WHERE key = 'req')
          AND to_id   = (SELECT id FROM schema_core.badges WHERE key = 'cancel')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO schema_acc.badge_transitions (from_id, to_id)
        SELECT f.id, t.id
        FROM schema_core.badges f, schema_core.badges t
        WHERE f.key = 'req' AND t.key = 'cancel'
          AND NOT EXISTS (
            SELECT 1 FROM schema_acc.badge_transitions
            WHERE from_id = f.id AND to_id = t.id
          )
        """
    )
