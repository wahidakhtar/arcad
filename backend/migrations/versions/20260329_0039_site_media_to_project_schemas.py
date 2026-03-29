"""Move site_media from schema_core to schema_ma and schema_mc

- Create schema_ma.site_media
- Create schema_mc.site_media
- Migrate existing data
- Drop schema_core.site_media

Revision ID: 20260329_0039
Revises: 20260329_0038
Create Date: 2026-03-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0039"
down_revision = "20260329_0038"
branch_labels = None
depends_on = None

_MEDIA_COLUMNS = [
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("site_id", sa.Integer(), nullable=False),
    sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
    sa.Column("file_path", sa.Text(), nullable=False),
    sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False),
    sa.Column("caption", sa.String(255), nullable=True),
    sa.Column("sequence_order", sa.Integer(), nullable=True),
]


def upgrade() -> None:
    for schema in ("schema_ma", "schema_mc"):
        op.create_table("site_media", *_MEDIA_COLUMNS, schema=schema)

    # Migrate data
    op.execute(
        """
        INSERT INTO schema_ma.site_media (id, site_id, uploaded_by, file_path, upload_date, caption, sequence_order)
        SELECT sm.id, sm.site_id, sm.uploaded_by, sm.file_path, sm.upload_date, sm.caption, sm.sequence_order
        FROM schema_core.site_media sm
        JOIN schema_core.projects p ON p.id = sm.project_id
        WHERE p.key = 'ma';
        """
    )
    op.execute(
        """
        INSERT INTO schema_mc.site_media (id, site_id, uploaded_by, file_path, upload_date, caption, sequence_order)
        SELECT sm.id, sm.site_id, sm.uploaded_by, sm.file_path, sm.upload_date, sm.caption, sm.sequence_order
        FROM schema_core.site_media sm
        JOIN schema_core.projects p ON p.id = sm.project_id
        WHERE p.key = 'mc';
        """
    )

    op.drop_table("site_media", schema="schema_core")


def downgrade() -> None:
    op.create_table(
        "site_media",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("caption", sa.String(255), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=True),
        schema="schema_core",
    )
    for project_key, schema in (("ma", "schema_ma"), ("mc", "schema_mc")):
        op.execute(
            f"""
            INSERT INTO schema_core.site_media (id, site_id, project_id, uploaded_by, file_path, upload_date, caption, sequence_order)
            SELECT sm.id, sm.site_id,
                   (SELECT id FROM schema_core.projects WHERE key = '{project_key}'),
                   sm.uploaded_by, sm.file_path, sm.upload_date, sm.caption, sm.sequence_order
            FROM {schema}.site_media sm;
            """
        )
    for schema in ("schema_ma", "schema_mc"):
        op.drop_table("site_media", schema=schema)
