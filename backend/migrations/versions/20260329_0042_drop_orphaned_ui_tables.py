"""drop orphaned ui tables from project schemas

Revision ID: 20260329_0042
Revises: 20260329_0041
Create Date: 2026-03-29
"""
from __future__ import annotations

from alembic import op

revision = "20260329_0042"
down_revision = "20260329_0041"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]


def upgrade() -> None:
    for schema in _SCHEMAS:
        op.execute(f"DROP VIEW IF EXISTS {schema}.ui")


def downgrade() -> None:
    pass  # no-op — these tables are orphaned and should not be restored
