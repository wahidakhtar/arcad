"""ui_fields: add finance tag, convert tag varchar to tag_id FK on schema_core.tags

Revision ID: 20260327_0029
Revises: 20260327_0028
Create Date: 2026-03-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260327_0029"
down_revision = "20260327_0028"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_bb", "schema_ma", "schema_mc", "schema_md", "schema_mi"]


def upgrade() -> None:
    op.execute(
        "INSERT INTO schema_core.tags (tag, description) VALUES "
        "('finance', 'Finance section fields: billing, cost, PO, invoice, and document badge data')"
    )

    for schema in _SCHEMAS:
        op.add_column("ui_fields", sa.Column("tag_id", sa.Integer, nullable=True), schema=schema)
        op.execute(
            f"UPDATE {schema}.ui_fields uf "
            f"SET tag_id = t.id FROM schema_core.tags t WHERE t.tag = uf.tag"
        )
        op.alter_column("ui_fields", "tag_id", nullable=False, schema=schema)
        op.create_foreign_key(
            f"fk_{schema}_ui_fields_tag_id",
            "ui_fields", "tags",
            ["tag_id"], ["id"],
            source_schema=schema,
            referent_schema="schema_core",
        )
        op.drop_column("ui_fields", "tag", schema=schema)


def downgrade() -> None:
    for schema in _SCHEMAS:
        op.add_column("ui_fields", sa.Column("tag", sa.String(64), nullable=True), schema=schema)
        op.execute(
            f"UPDATE {schema}.ui_fields uf "
            f"SET tag = t.tag FROM schema_core.tags t WHERE t.id = uf.tag_id"
        )
        op.alter_column("ui_fields", "tag", nullable=False, schema=schema)
        op.drop_constraint(f"fk_{schema}_ui_fields_tag_id", "ui_fields", schema=schema)
        op.drop_column("ui_fields", "tag_id", schema=schema)

    op.execute("DELETE FROM schema_core.tags WHERE tag = 'finance'")
