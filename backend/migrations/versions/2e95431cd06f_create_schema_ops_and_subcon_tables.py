"""create schema_ops and subcon tables

Revision ID: 2e95431cd06f
Revises: 49f8f6de667b
Create Date: 2026-03-24 15:07:02.706845
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "2e95431cd06f"
down_revision = "49f8f6de667b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS schema_ops")

    op.create_table(
        "subcon_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.Text(), nullable=False, unique=True),
        sa.Column("label", sa.Text(), nullable=False),
        schema="schema_ops",
    )

    op.execute(
        """
        INSERT INTO schema_ops.subcon_types (id, key, label) VALUES
        (1, 'isp', 'ISP'),
        (2, 'fe', 'Field Engineer')
        """
    )

    op.create_table(
        "subcons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("subcon_type_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.func.now()),
        schema="schema_ops",
    )

    op.create_foreign_key(
        "fk_subcons_type",
        "subcons",
        "subcon_types",
        ["subcon_type_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_ops",
    )

    op.create_table(
        "subcon_projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subcon_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.UniqueConstraint("subcon_id", "project_id", name="uq_subcon_project"),
        schema="schema_ops",
    )

    op.create_foreign_key(
        "fk_sp_subcon",
        "subcon_projects",
        "subcons",
        ["subcon_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_ops",
    )

    op.create_foreign_key(
        "fk_sp_project",
        "subcon_projects",
        "projects",
        ["project_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_core",
    )

    op.create_table(
        "subcon_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("subcon_id", sa.Integer(), nullable=False),
        sa.Column("bucket_id", sa.Integer(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.true()),
        sa.Column("assigned_by", sa.Integer()),
        sa.Column("assigned_at", sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column("removed_at", sa.TIMESTAMP()),
        sa.Column("version", sa.Integer(), server_default="1"),
        schema="schema_ops",
    )

    op.create_foreign_key(
        "fk_sa_subcon",
        "subcon_assignments",
        "subcons",
        ["subcon_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_ops",
    )

    op.create_foreign_key(
        "fk_sa_bucket",
        "subcon_assignments",
        "job_buckets",
        ["bucket_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_core",
    )

    op.create_foreign_key(
        "fk_sa_project",
        "subcon_assignments",
        "projects",
        ["project_id"],
        ["id"],
        source_schema="schema_ops",
        referent_schema="schema_core",
    )

    op.create_index(
        "ux_site_one_active_subcon",
        "subcon_assignments",
        ["site_id"],
        unique=True,
        postgresql_where=sa.text("active = TRUE"),
        schema="schema_ops",
    )


def downgrade() -> None:
    op.drop_index("ux_site_one_active_subcon", table_name="subcon_assignments", schema="schema_ops")
    op.drop_table("subcon_assignments", schema="schema_ops")
    op.drop_table("subcon_projects", schema="schema_ops")
    op.drop_table("subcons", schema="schema_ops")
    op.drop_table("subcon_types", schema="schema_ops")
