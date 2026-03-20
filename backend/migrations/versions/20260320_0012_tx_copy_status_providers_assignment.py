from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0012"
down_revision = "20260320_0011"
branch_labels = None
depends_on = None

# Migration 0012:
# 1. Add tx_copy_status VARCHAR to schema_md.sites
# 2. Add tx_copy_status row to schema_md.ui_fields
# 3. Alter schema_bb.providers: rename 'name' → 'label', add 'active' BOOL DEFAULT true
# 4. Extend schema_ops.fe_assignment:
#    - Drop fe_id NOT NULL check constraint
#    - Make fe_id column nullable
#    - Add provider_id INT FK → schema_bb.providers(id), nullable
#    - Add check constraint: exactly one of fe_id / provider_id must be non-null


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add tx_copy_status to schema_md.sites
    op.add_column(
        "sites",
        sa.Column("tx_copy_status", sa.String(length=64), nullable=True),
        schema="schema_md",
    )

    # 2. Add ui_fields row for tx_copy_status in schema_md.ui_fields
    conn.execute(
        sa.text(
            "SELECT setval('schema_md.ui_fields_id_seq', (SELECT MAX(id) FROM schema_md.ui_fields))"
        )
    )
    conn.execute(
        sa.text(
            "INSERT INTO schema_md.ui_fields (label, tag, type, section, list_view, form_view, bulk_view)"
            " VALUES ('Tx Copy Status', 'tx_copy_status', 'text', 'finance', false, false, false)"
        )
    )

    # 3. Alter schema_bb.providers: rename name → label, add active column
    op.alter_column(
        "providers",
        "name",
        new_column_name="label",
        schema="schema_bb",
    )
    op.add_column(
        "providers",
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        schema="schema_bb",
    )

    # 4a. Drop the CHECK constraint enforcing fe_id NOT NULL (use IF EXISTS — may already be gone)
    conn.execute(
        sa.text(
            "ALTER TABLE schema_ops.fe_assignment DROP CONSTRAINT IF EXISTS fe_assignment_fe_id_not_null"
        )
    )

    # 4b. Make fe_id nullable at column level (DROP NOT NULL is idempotent)
    conn.execute(
        sa.text("ALTER TABLE schema_ops.fe_assignment ALTER COLUMN fe_id DROP NOT NULL")
    )

    # 4c. Add provider_id FK → schema_bb.providers(id), nullable
    op.add_column(
        "fe_assignment",
        sa.Column(
            "provider_id",
            sa.Integer(),
            sa.ForeignKey("schema_bb.providers.id"),
            nullable=True,
        ),
        schema="schema_ops",
    )

    # 4d. Add check constraint: exactly one of fe_id / provider_id must be non-null
    op.create_check_constraint(
        "fe_assignment_fe_or_provider_not_null",
        "fe_assignment",
        "(fe_id IS NOT NULL AND provider_id IS NULL) OR (fe_id IS NULL AND provider_id IS NOT NULL)",
        schema="schema_ops",
    )


def downgrade() -> None:
    conn = op.get_bind()

    # Reverse 4d
    op.drop_constraint(
        "fe_assignment_fe_or_provider_not_null",
        "fe_assignment",
        schema="schema_ops",
        type_="check",
    )

    # Reverse 4c
    op.drop_column("fe_assignment", "provider_id", schema="schema_ops")

    # Reverse 4b
    op.alter_column(
        "fe_assignment",
        "fe_id",
        nullable=False,
        schema="schema_ops",
    )

    # Reverse 4a
    op.create_check_constraint(
        "fe_assignment_fe_id_not_null",
        "fe_assignment",
        "fe_id IS NOT NULL",
        schema="schema_ops",
    )

    # Reverse 3
    op.drop_column("providers", "active", schema="schema_bb")
    op.alter_column("providers", "label", new_column_name="name", schema="schema_bb")

    # Reverse 2
    conn.execute(
        sa.text("DELETE FROM schema_md.ui_fields WHERE tag = 'tx_copy_status'")
    )

    # Reverse 1
    op.drop_column("sites", "tx_copy_status", schema="schema_md")
