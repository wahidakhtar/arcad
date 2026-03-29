"""Add schema_core.recipients, redesign schema_acc.transactions

- Create schema_core.recipients lookup table (user / subcon)
- ADD recipient_type_id FK to schema_acc.transactions
- DROP FK constraint on recipient_id (keep as plain int)
- DROP bucket_key from schema_acc.transactions

Revision ID: 20260329_0035
Revises: 20260328_0034
Create Date: 2026-03-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0035"
down_revision = "20260328_0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create schema_core.recipients
    op.create_table(
        "recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(32), nullable=False, unique=True),
        sa.Column("label", sa.String(128), nullable=False),
        schema="schema_core",
    )
    op.execute(
        """
        INSERT INTO schema_core.recipients (id, key, label) VALUES
            (1, 'user', 'Internal User'),
            (2, 'subcon', 'Subcontractor')
        ON CONFLICT DO NOTHING;
        """
    )

    # 2. Drop FK constraint on transactions.recipient_id so it becomes a plain int
    op.execute(
        "ALTER TABLE schema_acc.transactions DROP CONSTRAINT IF EXISTS transactions_recipient_id_fkey;"
    )

    # 3. Add recipient_type_id FK → schema_core.recipients
    op.add_column(
        "transactions",
        sa.Column("recipient_type_id", sa.Integer(), sa.ForeignKey("schema_core.recipients.id"), nullable=True),
        schema="schema_acc",
    )

    # 4. Drop bucket_key
    op.drop_column("transactions", "bucket_key", schema="schema_acc")


def downgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("bucket_key", sa.String(32), nullable=True),
        schema="schema_acc",
    )
    op.drop_column("transactions", "recipient_type_id", schema="schema_acc")
    # Restore FK on recipient_id
    op.create_foreign_key(
        "transactions_recipient_id_fkey",
        "transactions",
        "users",
        ["recipient_id"],
        ["id"],
        source_schema="schema_acc",
        referent_schema="schema_hr",
    )
    op.drop_table("recipients", schema="schema_core")
