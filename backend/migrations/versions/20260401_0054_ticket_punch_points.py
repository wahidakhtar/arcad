"""ticket_punch_points

Revision ID: 20260401_0054
Revises: 20260401_0053
Create Date: 2026-04-01 18:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260401_0054"
down_revision = "20260401_0053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ticket_punch_points",
        sa.Column("ticket_id", sa.Integer(), nullable=False),
        sa.Column("punch_point_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["punch_point_id"], ["schema_ops.punch_point.id"]),
        sa.ForeignKeyConstraint(["ticket_id"], ["schema_ops.tickets.id"]),
        sa.PrimaryKeyConstraint("ticket_id", "punch_point_id"),
        schema="schema_ops",
    )
    op.execute(
        """
        INSERT INTO schema_ops.ticket_punch_points (ticket_id, punch_point_id)
        SELECT id, pp_id
        FROM schema_ops.tickets
        WHERE pp_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("ticket_punch_points", schema="schema_ops")
