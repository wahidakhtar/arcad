from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260403_0055"
down_revision = "20260401_0054"
branch_labels = None
depends_on = None

# Audit jobs previously scaled budget/cost by tower height (rate * height).
# Correct behaviour is rate * 1 — the rate already represents the per-site cost.
#
# Jobs changed:
#   jmi  (bmi)   height         → unit   (single-job bucket, qty defaults to 1)
#   jma  (bma)   height         → unit   (single-job bucket, qty defaults to 1)
#   jmd  (bmd)   height         → unit   (single-job bucket, qty defaults to 1)
#   jpaint (bmc) height_if_true → unit   (multi-job bucket, qty = 1 if mpaint else 0)
#
# Note: bucket_key was dropped from schema_core.jobs in migration 0037.
# Filter by job_key (unique, never dropped).


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE schema_core.jobs SET scale_by = 'unit'"
            " WHERE job_key IN ('jmi', 'jma', 'jmd', 'jpaint')"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height' WHERE job_key IN ('jmi', 'jma', 'jmd')"))
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height_if_true' WHERE job_key = 'jpaint'"))
