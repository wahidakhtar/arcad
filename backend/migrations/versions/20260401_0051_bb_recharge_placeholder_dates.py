from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260401_0051"
down_revision = "20260401_0050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("recharges", "date", existing_type=sa.Date(), nullable=True, schema="schema_bb")


def downgrade() -> None:
    op.alter_column("recharges", "date", existing_type=sa.Date(), nullable=False, schema="schema_bb")
