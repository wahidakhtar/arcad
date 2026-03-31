"""Add invoice_date column to schema_acc.invoices

Revision ID: 20260331_0046
Revises: 20260331_0045
Create Date: 2026-03-31
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260331_0046"
down_revision = "20260331_0045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("invoice_date", sa.Date(), nullable=True),
        schema="schema_acc",
    )


def downgrade() -> None:
    op.drop_column("invoices", "invoice_date", schema="schema_acc")
