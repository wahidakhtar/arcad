"""Add site active flag and scoped circuit uniqueness

Revision ID: 20260330_0043
Revises: 20260329_0042
Create Date: 2026-03-30
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260330_0043"
down_revision = "20260329_0042"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]


def upgrade() -> None:
    for schema in _SCHEMAS:
        op.add_column(
            "sites",
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            schema=schema,
        )
        op.execute(
            sa.text(
                f"""
                WITH ranked AS (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY subproject_id, ckt_id
                            ORDER BY id DESC
                        ) AS row_num
                    FROM {schema}.sites
                )
                UPDATE {schema}.sites s
                SET active = FALSE
                FROM ranked r
                WHERE s.id = r.id
                  AND r.row_num > 1
                """
            )
        )
        op.create_unique_constraint(
            f"uq_{schema}_sites_subproject_ckt_active",
            "sites",
            ["subproject_id", "ckt_id", "active"],
            schema=schema,
        )


def downgrade() -> None:
    for schema in reversed(_SCHEMAS):
        op.drop_constraint(f"uq_{schema}_sites_subproject_ckt_active", "sites", schema=schema, type_="unique")
        op.drop_column("sites", "active", schema=schema)
