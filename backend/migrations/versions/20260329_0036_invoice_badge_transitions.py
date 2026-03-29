"""Seed invoice badge transitions in schema_acc

pending(21) → generated(23)
raised(24)  → rejected(28)

Revision ID: 20260329_0036
Revises: 20260329_0035
Create Date: 2026-03-29
"""
from __future__ import annotations

from alembic import op

revision = "20260329_0036"
down_revision = "20260329_0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            invoice_type_id integer;
        BEGIN
            SELECT id INTO invoice_type_id FROM schema_core.transition_types WHERE key = 'invoice';
            INSERT INTO schema_acc.badge_transitions (type_id, from_id, to_id) VALUES
                (invoice_type_id, 21, 23),
                (invoice_type_id, 24, 28)
            ON CONFLICT DO NOTHING;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM schema_acc.badge_transitions
        WHERE type_id = (SELECT id FROM schema_core.transition_types WHERE key = 'invoice')
          AND from_id IN (21, 24);
        """
    )
