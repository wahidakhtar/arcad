"""Remove rfo from tickets; rename update_type→dept_id and drop po_id from updates

- schema_ops.tickets: drop rfo column
- schema_updates.updates: rename update_type (str) → dept_id (int FK → department badge)
  - 'ops'/'ops' → 3, 'finance' → 2
- schema_updates.updates: drop po_id column

Revision ID: 20260329_0041
Revises: 20260329_0039
Create Date: 2026-03-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0041"
down_revision = "20260329_0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop rfo from tickets
    op.drop_column("tickets", "rfo", schema="schema_ops")

    # 2. Rename update_type → dept_id and change type to int
    # Add new int column
    op.add_column(
        "updates",
        sa.Column("dept_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
        schema="schema_updates",
    )
    # Migrate data: 'finance' → 2 (acc badge), everything else → 3 (ops badge)
    op.execute(
        """
        UPDATE schema_updates.updates
        SET dept_id = CASE WHEN update_type = 'finance' THEN 2 ELSE 3 END;
        """
    )
    op.alter_column("updates", "dept_id", nullable=False, schema="schema_updates")
    op.drop_column("updates", "update_type", schema="schema_updates")

    # 3. Drop po_id FK constraint and column
    op.execute(
        "ALTER TABLE schema_updates.updates DROP CONSTRAINT IF EXISTS updates_po_id_fkey;"
    )
    op.drop_column("updates", "po_id", schema="schema_updates")


def downgrade() -> None:
    op.add_column(
        "updates",
        sa.Column("po_id", sa.Integer(), nullable=True),
        schema="schema_updates",
    )
    op.add_column(
        "updates",
        sa.Column("update_type", sa.String(16), nullable=True),
        schema="schema_updates",
    )
    op.execute(
        """
        UPDATE schema_updates.updates
        SET update_type = CASE WHEN dept_id = 2 THEN 'finance' ELSE 'ops' END;
        """
    )
    op.alter_column("updates", "update_type", nullable=False, schema="schema_updates")
    op.drop_column("updates", "dept_id", schema="schema_updates")
    op.add_column("tickets", sa.Column("rfo", sa.String(255), nullable=True), schema="schema_ops")
