"""drop legacy ops tables

Revision ID: b8edd77ca145
Revises: 2e95431cd06f
Create Date: 2026-03-24 15:12:26.233438
"""
from __future__ import annotations

from alembic import op

revision = "b8edd77ca145"
down_revision = "2e95431cd06f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS schema_ops.fe_assignment CASCADE")
    op.execute("DROP TABLE IF EXISTS schema_ops.punch_point CASCADE")
    op.execute("DROP TABLE IF EXISTS schema_ops.tickets CASCADE")


def downgrade() -> None:
    pass
