from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260403_0056"
down_revision = "20260403_0055"
branch_labels = None
depends_on = None

# Migration 0055 incorrectly changed scale_by for MI, MD, and MC (jpaint) jobs.
# Only MA (jma) was wrong. This migration restores the other three.
#
# Note: bucket_key was dropped from schema_core.jobs in migration 0037.
# Filter by job_key (unique, never dropped).


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height' WHERE job_key IN ('jmi', 'jmd')"))
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height_if_true' WHERE job_key = 'jpaint'"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'unit' WHERE job_key IN ('jmi', 'jmd', 'jpaint')"))
