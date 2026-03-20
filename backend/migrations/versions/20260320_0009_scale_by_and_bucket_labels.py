from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0009"
down_revision = "20260320_0008"
branch_labels = None
depends_on = None

# Jobs table: update scale_by for ma, mpaint, mdv
# job_buckets table: strip project prefix from bmdv/bmd labels


def upgrade() -> None:
    conn = op.get_bind()

    # Fix 4: ma should scale by height (not unit)
    conn.execute(
        sa.text("UPDATE schema_core.jobs SET scale_by = 'height' WHERE bucket_key = 'ma'")
    )

    # Fix 2: mpaint only costs when site.mpaint is truthy, then scales by height
    conn.execute(
        sa.text("UPDATE schema_core.jobs SET scale_by = 'height_if_true' WHERE bucket_key = 'mpaint'")
    )

    # Fix 5: mdv should check visit_date (MD sites have visit_date, not a mdv column)
    conn.execute(
        sa.text("UPDATE schema_core.jobs SET scale_by = 'visit_date' WHERE bucket_key = 'mdv'")
    )

    # Fix 6: strip project prefix from bucket labels
    conn.execute(
        sa.text("UPDATE schema_core.job_buckets SET label = 'Visit' WHERE key = 'bmdv'")
    )
    conn.execute(
        sa.text("UPDATE schema_core.job_buckets SET label = 'Dismantle' WHERE key = 'bmd'")
    )

    # Fix 7: add provider_id to field_permissions so ops users can write it on BB sites
    fp_table = sa.table(
        "field_permissions",
        sa.column("field_key", sa.String()),
        sa.column("dept_key", sa.String()),
        schema="schema_core",
    )
    op.bulk_insert(fp_table, [{"field_key": "provider_id", "dept_key": "ops"}])


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'unit' WHERE bucket_key = 'ma'"))
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'height' WHERE bucket_key = 'mpaint'"))
    conn.execute(sa.text("UPDATE schema_core.jobs SET scale_by = 'unit' WHERE bucket_key = 'mdv'"))
    conn.execute(sa.text("UPDATE schema_core.job_buckets SET label = 'MD Visit' WHERE key = 'bmdv'"))
    conn.execute(sa.text("UPDATE schema_core.job_buckets SET label = 'MD' WHERE key = 'bmd'"))
    conn.execute(
        sa.text("DELETE FROM schema_core.field_permissions WHERE field_key = 'provider_id' AND dept_key = 'ops'")
    )
