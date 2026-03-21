"""active_fe_perm_tag_site_write: set active_fe perm_tag to 'site:write'

Only users with site:write see active_fe (hides it from FO / read-only roles).

Revision ID: 20260321_0024
Revises: 20260321_0023
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0024"
down_revision = "20260321_0023"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]


def upgrade() -> None:
    for schema in _SCHEMAS:
        op.execute(sa.text(
            f"UPDATE {schema}.ui_fields SET perm_tag = 'site:write' WHERE tag = 'active_fe'"
        ))


def downgrade() -> None:
    for schema in _SCHEMAS:
        op.execute(sa.text(
            f"UPDATE {schema}.ui_fields SET perm_tag = NULL WHERE tag = 'active_fe'"
        ))
