"""add project_id to job_buckets

Revision ID: 49f8f6de667b
Revises: 20260323_0027
Create Date: 2026-03-24 14:59:50.833739
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "49f8f6de667b"
down_revision = "20260323_0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "job_buckets",
        sa.Column("project_id", sa.Integer(), nullable=True),
        schema="schema_core",
    )

    op.execute(
        """
        UPDATE schema_core.job_buckets SET project_id = 1 WHERE key = 'bmi';
        UPDATE schema_core.job_buckets SET project_id = 3 WHERE key = 'bma';
        UPDATE schema_core.job_buckets SET project_id = 4 WHERE key = 'bmc';
        UPDATE schema_core.job_buckets SET project_id = 2 WHERE key = 'bmdv';
        UPDATE schema_core.job_buckets SET project_id = 2 WHERE key = 'bmd';
        """
    )

    result = op.get_bind().execute(
        sa.text("SELECT id, key FROM schema_core.job_buckets WHERE project_id IS NULL")
    ).fetchall()
    if result:
        raise Exception(f"Unmapped job_buckets found: {result}")

    op.alter_column(
        "job_buckets",
        "project_id",
        nullable=False,
        schema="schema_core",
    )

    op.create_foreign_key(
        "fk_job_buckets_project",
        "job_buckets",
        "projects",
        ["project_id"],
        ["id"],
        source_schema="schema_core",
        referent_schema="schema_core",
    )

    op.create_index(
        "ux_project_bucket_key",
        "job_buckets",
        ["project_id", "key"],
        unique=True,
        schema="schema_core",
    )


def downgrade() -> None:
    op.drop_index("ux_project_bucket_key", table_name="job_buckets", schema="schema_core")
    op.drop_constraint("fk_job_buckets_project", "job_buckets", type_="foreignkey", schema="schema_core")
    op.drop_column("job_buckets", "project_id", schema="schema_core")
