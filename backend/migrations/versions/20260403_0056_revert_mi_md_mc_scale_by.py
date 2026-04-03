from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260403_0056"
down_revision = "20260403_0055"
branch_labels = None
depends_on = None

# Migration 0055 incorrectly changed scale_by for MI, MD, and MC (mpaint) jobs.
# Only MA (jma) was wrong. This migration restores the other three.


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height' WHERE bucket_key IN ('mi', 'md')"))
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height_if_true' WHERE bucket_key = 'mpaint'"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'unit' WHERE bucket_key IN ('mi', 'md', 'mpaint')"))
