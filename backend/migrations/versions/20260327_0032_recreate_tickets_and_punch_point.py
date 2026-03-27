"""Recreate schema_ops.punch_point and schema_ops.tickets dropped prematurely

Revision ID: 20260327_0032
Revises: ad6b8dcc498c
Create Date: 2026-03-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260327_0032"
down_revision = "ad6b8dcc498c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS schema_ops")

    op.create_table(
        "punch_point",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        schema="schema_ops",
    )

    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_number", sa.String(128), nullable=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("ticket_date", sa.Date(), nullable=False),
        sa.Column("ticket_time", sa.Time(), nullable=True),
        sa.Column("pp_id", sa.Integer(), sa.ForeignKey("schema_ops.punch_point.id"), nullable=True),
        sa.Column("rfo", sa.String(255), nullable=True),
        sa.Column("closing_date", sa.Date(), nullable=True),
        sa.Column("closing_time", sa.Time(), nullable=True),
        schema="schema_ops",
    )

    op.create_index("ix_tickets_site_id", "tickets", ["site_id"], schema="schema_ops")


def downgrade() -> None:
    op.drop_index("ix_tickets_site_id", table_name="tickets", schema="schema_ops")
    op.drop_table("tickets", schema="schema_ops")
    op.drop_table("punch_point", schema="schema_ops")
