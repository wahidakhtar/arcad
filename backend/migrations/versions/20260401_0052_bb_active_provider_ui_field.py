from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260401_0052"
down_revision = "20260401_0051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE schema_bb.ui_fields
            SET key = 'active_provider',
                label = 'Active Provider'
            WHERE key = 'active_fe'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE schema_bb.ui_fields
            SET key = 'active_fe',
                label = 'Active FE'
            WHERE key = 'active_provider'
            """
        )
    )
