"""fo_site_read: grant fol1 role read access to 'site' tag

Revision ID: 20260321_0023
Revises: 20260321_0022
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0023"
down_revision = "20260321_0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text(
        """
        INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
        SELECT r.id, t.id, TRUE, FALSE
        FROM schema_hr.roles r
        CROSS JOIN schema_core.tags t
        WHERE r.key = 'fol1' AND t.tag = 'site'
        ON CONFLICT (role_id, tag_id) DO UPDATE SET read = TRUE
        """
    ))


def downgrade() -> None:
    op.execute(sa.text(
        """
        DELETE FROM schema_core.role_tags
        WHERE role_id = (SELECT id FROM schema_hr.roles WHERE key = 'fol1')
          AND tag_id  = (SELECT id FROM schema_core.tags WHERE tag = 'site')
        """
    ))
