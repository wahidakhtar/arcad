"""Remove redundant columns: job_key from rate_card, bucket_key from jobs

- schema_acc.rate_card: drop job_key (redundant with job_id FK)
- schema_core.jobs: drop bucket_key (redundant with job_bucket_id FK)

Revision ID: 20260329_0037
Revises: 20260329_0036
Create Date: 2026-03-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0037"
down_revision = "20260329_0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("rate_card", "job_key", schema="schema_acc")
    op.drop_column("jobs", "bucket_key", schema="schema_core")


def downgrade() -> None:
    op.add_column("jobs", sa.Column("bucket_key", sa.String(32), nullable=True), schema="schema_core")
    # Repopulate bucket_key from job_buckets join
    op.execute(
        """
        UPDATE schema_core.jobs j
        SET bucket_key = jb.key
        FROM schema_core.job_buckets jb
        WHERE jb.id = j.job_bucket_id;
        """
    )
    op.add_column("rate_card", sa.Column("job_key", sa.String(32), nullable=True), schema="schema_acc")
    # Repopulate job_key from jobs join
    op.execute(
        """
        UPDATE schema_acc.rate_card rc
        SET job_key = j.job_key
        FROM schema_core.jobs j
        WHERE j.id = rc.job_id;
        """
    )
