from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0013"
down_revision = "20260320_0012"
branch_labels = None
depends_on = None

# Make fe_assignment.bucket_id nullable so BB provider assignments
# (which have no bucket concept) can be stored in the same table.


def upgrade() -> None:
    conn = op.get_bind()

    # Drop the NOT NULL CHECK constraint on bucket_id
    conn.execute(
        sa.text(
            "ALTER TABLE schema_ops.fe_assignment "
            "DROP CONSTRAINT IF EXISTS fe_assignment_bucket_id_not_null"
        )
    )

    # Drop the NOT NULL at column level
    conn.execute(
        sa.text(
            "ALTER TABLE schema_ops.fe_assignment ALTER COLUMN bucket_id DROP NOT NULL"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "ALTER TABLE schema_ops.fe_assignment ALTER COLUMN bucket_id SET NOT NULL"
        )
    )
    op.create_check_constraint(
        "fe_assignment_bucket_id_not_null",
        "fe_assignment",
        "bucket_id IS NOT NULL",
        schema="schema_ops",
    )
