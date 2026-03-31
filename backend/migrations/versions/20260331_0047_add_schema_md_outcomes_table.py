"""Add schema_md.outcomes table

Revision ID: 20260331_0047
Revises: 20260331_0046
Create Date: 2026-03-31
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260331_0047"
down_revision = "20260331_0046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "outcomes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        schema="schema_md",
    )
    op.execute(
        """
        INSERT INTO schema_md.outcomes (label, "order") VALUES
            ('Dismantle', 1),
            ('Asset Tx', 2),
            ('Company Shifted', 3),
            ('Company not Found', 4);
        """
    )


def downgrade() -> None:
    op.drop_table("outcomes", schema="schema_md")
