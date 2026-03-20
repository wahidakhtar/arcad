from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0008"
down_revision = "20260320_0007"
branch_labels = None
depends_on = None

# Mirrors FIELD_WRITE_SCOPE that was previously hardcoded in auth.py
_FIELD_WRITE_SCOPE: dict[str, list[str]] = {
    "ops": [
        "receiving_date", "customer", "height", "address", "city", "state_id", "lc",
        "permission_date", "edd", "followup_date", "completion_date", "visit_date",
        "outcome", "dismantle_date", "scrap_value", "audit_date",
        "mpaint", "mnbr", "arr", "ep", "ec", "cm_date",
    ],
    "acc": [
        "po_number", "invoice_number", "po_status_id", "invoice_status_id",
        "doc_status_id", "wcc_status_id", "fsr_status_id", "report_status_id",
    ],
}


def upgrade() -> None:
    op.create_table(
        "field_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("field_key", sa.String(length=64), nullable=False),
        sa.Column("dept_key", sa.String(length=32), nullable=False),
        schema="schema_core",
    )

    fp_table = sa.table(
        "field_permissions",
        sa.column("field_key", sa.String()),
        sa.column("dept_key", sa.String()),
        schema="schema_core",
    )
    rows = [
        {"field_key": field_key, "dept_key": dept_key}
        for dept_key, fields in _FIELD_WRITE_SCOPE.items()
        for field_key in fields
    ]
    op.bulk_insert(fp_table, rows)


def downgrade() -> None:
    op.drop_table("field_permissions", schema="schema_core")
