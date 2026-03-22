"""business_rules: add wcc_status_id to md.sites, subproject_id to acc.pos

Revision ID: 20260322_0026
Revises: 20260322_0025
Create Date: 2026-03-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260322_0026"
down_revision = "20260322_0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Step 1 — Add wcc_status_id to schema_md.sites
    # ------------------------------------------------------------------
    op.add_column("sites", sa.Column("wcc_status_id", sa.Integer(), nullable=True), schema="schema_md")

    # ------------------------------------------------------------------
    # Step 2 — Add subproject_id to schema_acc.pos
    # ------------------------------------------------------------------
    op.add_column("pos", sa.Column("subproject_id", sa.Integer(), nullable=True), schema="schema_acc")


def downgrade() -> None:
    op.drop_column("pos", "subproject_id", schema="schema_acc")
    op.drop_column("sites", "wcc_status_id", schema="schema_md")
