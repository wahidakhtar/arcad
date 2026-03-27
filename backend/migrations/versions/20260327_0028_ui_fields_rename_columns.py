"""ui_fields: rename tag→key, section→tag, drop perm_tag across all project schemas

Revision ID: 20260327_0028
Revises: 20260323_0027
Create Date: 2026-03-27
"""
from __future__ import annotations

from alembic import op

revision = "20260327_0028"
down_revision = "20260323_0027"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_bb", "schema_ma", "schema_mc", "schema_md", "schema_mi"]


def upgrade() -> None:
    for schema in _SCHEMAS:
        op.alter_column("ui_fields", "tag", new_column_name="key", schema=schema)
        op.alter_column("ui_fields", "section", new_column_name="tag", schema=schema)
        op.drop_column("ui_fields", "perm_tag", schema=schema)


def downgrade() -> None:
    for schema in _SCHEMAS:
        op.add_column("ui_fields", __import__("sqlalchemy").Column("perm_tag", __import__("sqlalchemy").String(64), nullable=True), schema=schema)
        op.alter_column("ui_fields", "tag", new_column_name="section", schema=schema)
        op.alter_column("ui_fields", "key", new_column_name="tag", schema=schema)
