"""Rename Delhi to Delhi-NCR in indian_states

Revision ID: 20260330_0045
Revises: 20260330_0044
Create Date: 2026-03-30
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260330_0045"
down_revision = "20260330_0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE schema_core.indian_states
            SET label = 'Delhi-NCR'
            WHERE label = 'Delhi'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE schema_core.indian_states
            SET label = 'Delhi'
            WHERE label = 'Delhi-NCR'
            """
        )
    )
