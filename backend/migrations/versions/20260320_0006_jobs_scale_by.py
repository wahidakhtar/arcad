from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0006"
down_revision = "20260319_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("scale_by", sa.String(length=16), nullable=False, server_default="unit"),
        schema="schema_core",
    )
    # Remove the server_default so it doesn't persist (values are fully populated below)
    op.alter_column("jobs", "scale_by", server_default=None, schema="schema_core")

    # Populate scale_by for all seeded jobs by bucket_key
    op.execute(sa.text("""
        UPDATE schema_core.jobs SET scale_by = 'height' WHERE bucket_key IN ('mi', 'mpaint', 'md');
        UPDATE schema_core.jobs SET scale_by = 'numeric' WHERE bucket_key = 'ec';
        UPDATE schema_core.jobs SET scale_by = 'unit'
            WHERE bucket_key NOT IN ('mi', 'mpaint', 'md', 'ec');
    """))


def downgrade() -> None:
    op.drop_column("jobs", "scale_by", schema="schema_core")
