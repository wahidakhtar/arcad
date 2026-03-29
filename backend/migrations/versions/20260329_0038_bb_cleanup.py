"""BB schema cleanup

- schema_bb.sites: drop provider_id FK column, add active_provider varchar
- schema_bb.recharges: rename uom → months (bool), migrate data
- schema_bb.providers: drop table
- schema_core.field_permissions: rename provider_id → active_provider

Revision ID: 20260329_0038
Revises: 20260329_0037
Create Date: 2026-03-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0038"
down_revision = "20260329_0037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop provider_id FK constraint and column from schema_bb.sites
    op.execute(
        "ALTER TABLE schema_bb.sites DROP CONSTRAINT IF EXISTS sites_provider_id_fkey;"
    )
    op.drop_column("sites", "provider_id", schema="schema_bb")

    # 2. Add active_provider varchar column to schema_bb.sites
    op.add_column(
        "sites",
        sa.Column("active_provider", sa.String(255), nullable=True),
        schema="schema_bb",
    )

    # 3. Recharges: add months bool column, migrate data from uom, then drop uom
    op.add_column(
        "recharges",
        sa.Column("months", sa.Boolean(), nullable=True),
        schema="schema_bb",
    )
    op.execute(
        """
        UPDATE schema_bb.recharges
        SET months = CASE WHEN uom = 'months' THEN TRUE ELSE FALSE END;
        """
    )
    op.alter_column("recharges", "months", nullable=False, schema="schema_bb")
    op.drop_column("recharges", "uom", schema="schema_bb")

    # 4. Drop schema_bb.providers table
    op.drop_table("providers", schema="schema_bb")

    # 5. Update field_permissions: rename provider_id → active_provider
    op.execute(
        """
        UPDATE schema_core.field_permissions
        SET field_key = 'active_provider'
        WHERE field_key = 'provider_id';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE schema_core.field_permissions
        SET field_key = 'provider_id'
        WHERE field_key = 'active_provider';
        """
    )
    op.create_table(
        "providers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        schema="schema_bb",
    )
    op.add_column("recharges", sa.Column("uom", sa.String(32), nullable=True), schema="schema_bb")
    op.execute(
        """
        UPDATE schema_bb.recharges
        SET uom = CASE WHEN months THEN 'months' ELSE 'days' END;
        """
    )
    op.alter_column("recharges", "uom", nullable=False, schema="schema_bb")
    op.drop_column("recharges", "months", schema="schema_bb")
    op.drop_column("sites", "active_provider", schema="schema_bb")
    op.add_column(
        "sites",
        sa.Column("provider_id", sa.Integer(), nullable=True),
        schema="schema_bb",
    )
