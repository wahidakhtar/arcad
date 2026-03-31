"""Convert MD outcome text column to outcome_id FK

Revision ID: 20260331_0048
Revises: 20260331_0047
Create Date: 2026-03-31
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260331_0048"
down_revision = "20260331_0047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sites", sa.Column("outcome_id", sa.Integer(), nullable=True), schema="schema_md")
    op.create_foreign_key(
        "fk_md_sites_outcome",
        "sites",
        "outcomes",
        ["outcome_id"],
        ["id"],
        source_schema="schema_md",
        referent_schema="schema_md",
    )
    op.execute(
        """
        UPDATE schema_md.sites s
        SET outcome_id = o.id
        FROM schema_md.outcomes o
        WHERE s.outcome IS NOT NULL
          AND lower(trim(s.outcome)) = lower(trim(o.label));
        """
    )
    op.drop_column("sites", "outcome", schema="schema_md")
    op.execute("UPDATE schema_md.ui_fields SET type = 'dropdown' WHERE key = 'outcome'")


def downgrade() -> None:
    op.add_column("sites", sa.Column("outcome", sa.String(length=128), nullable=True), schema="schema_md")
    op.execute(
        """
        UPDATE schema_md.sites s
        SET outcome = o.label
        FROM schema_md.outcomes o
        WHERE s.outcome_id = o.id;
        """
    )
    op.drop_constraint("fk_md_sites_outcome", "sites", schema="schema_md", type_="foreignkey")
    op.drop_column("sites", "outcome_id", schema="schema_md")
    op.execute("UPDATE schema_md.ui_fields SET type = 'text' WHERE key = 'outcome'")
