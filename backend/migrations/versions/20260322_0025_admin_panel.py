"""admin_panel: add order to ui_fields, add admin tag

Revision ID: 20260322_0025
Revises: 20260321_0024
Create Date: 2026-03-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260322_0025"
down_revision = "20260321_0024"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Step 1 — Add order column to ui_fields in all project schemas
    # ------------------------------------------------------------------
    for schema in _SCHEMAS:
        op.add_column(
            "ui_fields",
            sa.Column("order", sa.Integer(), nullable=True),
            schema=schema,
        )
        op.execute(sa.text(
            f'UPDATE {schema}.ui_fields SET "order" = id'
        ))

    # ------------------------------------------------------------------
    # Step 2 — Insert "admin" tag into schema_core.tags
    # ------------------------------------------------------------------
    op.execute(sa.text(
        "INSERT INTO schema_core.tags (tag, description) VALUES ('admin', 'Access to admin configuration panel')"
    ))

    # ------------------------------------------------------------------
    # Step 3 — Grant admin tag to mgmt l3 (role_id=1) and mgmt l1 (role_id=3)
    # ------------------------------------------------------------------
    op.execute(sa.text(
        """
        INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
        SELECT r.id, t.id, TRUE, TRUE
        FROM schema_hr.roles r, schema_core.tags t
        WHERE r.dept_key = 'mgmt' AND r.level_key IN ('l1', 'l3') AND t.tag = 'admin'
        ON CONFLICT (role_id, tag_id) DO NOTHING
        """
    ))


def downgrade() -> None:
    # Remove admin role_tags
    op.execute(sa.text(
        """
        DELETE FROM schema_core.role_tags
        WHERE tag_id = (SELECT id FROM schema_core.tags WHERE tag = 'admin')
        """
    ))

    # Remove admin tag
    op.execute(sa.text(
        "DELETE FROM schema_core.tags WHERE tag = 'admin'"
    ))

    # Drop order column from all project schemas
    for schema in _SCHEMAS:
        op.drop_column("ui_fields", "order", schema=schema)
