"""grant project:read to ops roles (opsl1, opsl2, opsl3)

Frontend pages (SiteListPage, SiteDetailPage) call GET /projects to fetch project
metadata for list columns and detail page setup. All ops roles lacked project:read,
causing GET /projects to return 403, which silently broke the site list page (empty
table, no error) and crashed the site detail page ("Unable to load site details.").

Ops roles need read-only access to the projects list — they do not need write access.

Revision ID: 20260328_0033
Revises: 20260327_0032
Create Date: 2026-03-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260328_0033"
down_revision = "20260327_0032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text(
        """
        INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
        SELECT r.id, t.id, TRUE, FALSE
        FROM schema_hr.roles r
        CROSS JOIN schema_core.tags t
        WHERE r.key IN ('opsl1', 'opsl2', 'opsl3') AND t.tag = 'project'
        ON CONFLICT (role_id, tag_id) DO UPDATE SET read = TRUE
        """
    ))


def downgrade() -> None:
    op.execute(sa.text(
        """
        DELETE FROM schema_core.role_tags
        WHERE role_id IN (SELECT id FROM schema_hr.roles WHERE key IN ('opsl1', 'opsl2', 'opsl3'))
          AND tag_id  = (SELECT id FROM schema_core.tags WHERE tag = 'project')
        """
    ))
