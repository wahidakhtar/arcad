"""Add removed_cost to subcon assignments

Revision ID: 20260330_0044
Revises: 20260330_0043
Create Date: 2026-03-30
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260330_0044"
down_revision = "20260330_0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "subcon_assignments",
        sa.Column("removed_cost", sa.Numeric(12, 2), nullable=True),
        schema="schema_ops",
    )


def downgrade() -> None:
    op.drop_column("subcon_assignments", "removed_cost", schema="schema_ops")
