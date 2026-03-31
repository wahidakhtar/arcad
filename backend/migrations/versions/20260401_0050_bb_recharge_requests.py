from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260401_0050"
down_revision = "20260331_0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recharge_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("schema_acc.transactions.id"), nullable=False, unique=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("schema_bb.sites.id"), nullable=False),
        sa.Column("validity", sa.Integer(), nullable=False),
        sa.Column("months", sa.Boolean(), nullable=False),
        sa.Column("recharge_id", sa.Integer(), sa.ForeignKey("schema_bb.recharges.id"), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        schema="schema_bb",
    )


def downgrade() -> None:
    op.drop_table("recharge_requests", schema="schema_bb")
