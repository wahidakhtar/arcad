"""subcon_assignment_project_site_unique

Revision ID: 20260401_0053
Revises: 20260401_0052
Create Date: 2026-04-01 16:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260401_0053"
down_revision = "20260401_0052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ux_site_one_active_subcon", table_name="subcon_assignments", schema="schema_ops")
    op.create_index(
        "ux_project_site_one_active_subcon",
        "subcon_assignments",
        ["project_id", "site_id"],
        unique=True,
        postgresql_where=sa.text("active = TRUE"),
        schema="schema_ops",
    )


def downgrade() -> None:
    op.drop_index("ux_project_site_one_active_subcon", table_name="subcon_assignments", schema="schema_ops")
    op.create_index(
        "ux_site_one_active_subcon",
        "subcon_assignments",
        ["site_id"],
        unique=True,
        postgresql_where=sa.text("active = TRUE"),
        schema="schema_ops",
    )
