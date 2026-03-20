"""update_type: add update_type column to schema_updates.updates

Revision ID: 20260320_0016
Revises: 20260320_0015
Create Date: 2026-03-20
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0016"
down_revision = "20260320_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "updates",
        sa.Column(
            "update_type",
            sa.String(16),
            nullable=False,
            server_default="ops",
        ),
        schema="schema_updates",
    )


def downgrade() -> None:
    op.drop_column("updates", "update_type", schema="schema_updates")
