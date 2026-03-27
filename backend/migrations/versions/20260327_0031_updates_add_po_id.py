"""Add po_id (nullable FK to schema_acc.pos) to schema_updates.updates

Revision ID: 20260327_0031
Revises: 20260327_0030
Create Date: 2026-03-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260327_0031"
down_revision = "20260327_0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "updates",
        sa.Column("po_id", sa.Integer, sa.ForeignKey("schema_acc.pos.id"), nullable=True),
        schema="schema_updates",
    )
    op.alter_column("updates", "site_id", nullable=True, schema="schema_updates")


def downgrade() -> None:
    op.alter_column("updates", "site_id", nullable=False, schema="schema_updates")
    op.drop_column("updates", "po_id", schema="schema_updates")
