"""Init report_status_id to pend for existing completed MA and MC sites

Revision ID: 0058
Revises: 0057
Create Date: 2026-04-04

- MA sites with audit_date set (comp) but report_status_id NULL → pend
- MC sites with cm_date set (comp) but report_status_id NULL → pend
"""

from alembic import op
import sqlalchemy as sa

revision = "20260404_0058"
down_revision = "20260403_0057"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    pend_id = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE type = 'doc_status' AND key = 'pend'")
    ).scalar()

    if pend_id is None:
        return

    conn.execute(sa.text(
        "UPDATE schema_ma.sites SET report_status_id = :pend "
        "WHERE audit_date IS NOT NULL AND report_status_id IS NULL"
    ), {"pend": pend_id})

    conn.execute(sa.text(
        "UPDATE schema_mc.sites SET report_status_id = :pend "
        "WHERE cm_date IS NOT NULL AND report_status_id IS NULL"
    ), {"pend": pend_id})


def downgrade():
    pass
