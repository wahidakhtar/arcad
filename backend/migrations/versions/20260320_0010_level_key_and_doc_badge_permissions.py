from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0010"
down_revision = "20260320_0009"
branch_labels = None
depends_on = None

# Migration 0010:
# 1. Add level_key column to schema_core.field_permissions
# 2. Update all existing ops rows to level_key = 'l2'
# 3. Insert doc badge field rows for ops with level_key = NULL (all levels)

_DOC_BADGE_OPS_FIELDS = [
    "wcc_status",
    "fsr_status",
    "report_status",
    "tx_copy_status",
]


def upgrade() -> None:
    op.add_column(
        "field_permissions",
        sa.Column("level_key", sa.String(length=32), nullable=True),
        schema="schema_core",
    )

    conn = op.get_bind()

    # All existing ops rows require at least level l2
    conn.execute(
        sa.text(
            "UPDATE schema_core.field_permissions SET level_key = 'l2' WHERE dept_key = 'ops'"
        )
    )

    # Doc badge fields for ops: all levels (level_key = NULL)
    fp_table = sa.table(
        "field_permissions",
        sa.column("field_key", sa.String()),
        sa.column("dept_key", sa.String()),
        sa.column("level_key", sa.String()),
        schema="schema_core",
    )
    op.bulk_insert(
        fp_table,
        [{"field_key": fk, "dept_key": "ops", "level_key": None} for fk in _DOC_BADGE_OPS_FIELDS],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM schema_core.field_permissions WHERE dept_key = 'ops' AND field_key = ANY(:fields)",
        ).bindparams(fields=_DOC_BADGE_OPS_FIELDS),
    )
    conn.execute(
        sa.text(
            "UPDATE schema_core.field_permissions SET level_key = NULL WHERE dept_key = 'ops'"
        )
    )
    op.drop_column("field_permissions", "level_key", schema="schema_core")
