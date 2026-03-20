"""permission_tag_updates: acc_update/assign_role new tags, doc_badge/update tag cleanup

Revision ID: 20260320_0015
Revises: 20260320_0014
Create Date: 2026-03-20
"""
from __future__ import annotations

from alembic import op

revision = "20260320_0015"
down_revision = "20260320_0014"
branch_labels = None
depends_on = None

# Role IDs (stable — seeded in initial migration):
# 1=mgmtl3, 2=mgmtl2, 3=mgmtl1, 4=accl2, 5=accl1
# 6=opsl3,  7=opsl2,  8=opsl1,  9=hrl1, 10=fol1


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. update tag — remove acc rows (acc no longer gets update access)
    # ------------------------------------------------------------------
    op.execute(
        """
        DELETE FROM schema_core.permission_tags
        WHERE tag = 'update'
          AND role_id IN (
            SELECT id FROM schema_hr.roles WHERE dept_key = 'acc'
          )
        """
    )

    # ------------------------------------------------------------------
    # 2. doc_badge tag — remove mgmt l2/l1 and all acc rows
    #    (only ops l1/l2/l3 and mgmt l3 retain doc_badge access)
    # ------------------------------------------------------------------
    op.execute(
        """
        DELETE FROM schema_core.permission_tags
        WHERE tag = 'doc_badge'
          AND role_id IN (
            SELECT id FROM schema_hr.roles
            WHERE (dept_key = 'mgmt' AND level_key IN ('l1', 'l2'))
               OR dept_key = 'acc'
          )
        """
    )

    # ------------------------------------------------------------------
    # 3. acc_update tag — new tag for finance update feed
    #    acc l1/l2: R+W  |  mgmt l3/l2: R  |  everyone else: no access
    # ------------------------------------------------------------------
    # Clean up in case migration is re-run
    op.execute("DELETE FROM schema_core.permission_tags WHERE tag = 'acc_update'")

    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'acc_update', TRUE, TRUE
        FROM schema_hr.roles WHERE dept_key = 'acc' AND level_key IN ('l1', 'l2')
        """
    )
    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'acc_update', TRUE, FALSE
        FROM schema_hr.roles WHERE dept_key = 'mgmt' AND level_key IN ('l2', 'l3')
        """
    )

    # ------------------------------------------------------------------
    # 4. assign_role tag — new tag replacing hr-based role assignment
    #    mgmt l3/l2: R+W  |  hr l1: R  |  everyone else: no access
    # ------------------------------------------------------------------
    op.execute("DELETE FROM schema_core.permission_tags WHERE tag = 'assign_role'")

    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'assign_role', TRUE, TRUE
        FROM schema_hr.roles WHERE dept_key = 'mgmt' AND level_key IN ('l2', 'l3')
        """
    )
    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'assign_role', TRUE, FALSE
        FROM schema_hr.roles WHERE dept_key = 'hr' AND level_key = 'l1'
        """
    )


def downgrade() -> None:
    # Remove new tags
    op.execute("DELETE FROM schema_core.permission_tags WHERE tag IN ('acc_update', 'assign_role')")

    # Restore acc rows for update tag
    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'update',
               TRUE,
               CASE WHEN level_key IN ('l1', 'l2') THEN TRUE ELSE TRUE END
        FROM schema_hr.roles WHERE dept_key = 'acc'
        """
    )

    # Restore doc_badge rows for mgmt l2/l1 and acc (read-only)
    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT id, 'doc_badge', TRUE, FALSE
        FROM schema_hr.roles
        WHERE (dept_key = 'mgmt' AND level_key IN ('l1', 'l2'))
           OR dept_key = 'acc'
        """
    )
