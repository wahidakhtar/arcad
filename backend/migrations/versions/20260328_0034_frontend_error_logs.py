"""Add schema_core.frontend_error_logs table

Revision ID: 20260328_0034
Revises: 20260328_0033
Create Date: 2026-03-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260328_0034"
down_revision = "20260328_0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "frontend_error_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("schema_hr.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("page_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("error_type", sa.String(64), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("stack_trace", sa.Text(), nullable=True),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("http_url", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=False, server_default=""),
        sa.Column("extra", sa.JSON(), nullable=True),
        schema="schema_core",
    )
    op.create_index(
        "ix_frontend_error_logs_created_at",
        "frontend_error_logs",
        ["created_at"],
        schema="schema_core",
    )


def downgrade() -> None:
    op.drop_index("ix_frontend_error_logs_created_at", "frontend_error_logs", schema="schema_core")
    op.drop_table("frontend_error_logs", schema="schema_core")
