"""tags_table_and_role_tags: introduce schema_core.tags registry, rename permission_tags → role_tags with FK

Steps:
  1. Create schema_core.tags and seed all tags + deprecated ones
  2. Create schema_core.role_tags with FK to tags and schema_hr.roles
  3. Migrate data from permission_tags (exclude assign_role, user)
  4. Apply corrected permission matrix (acc l1 billing write; hr l1 role read)
  5. Drop schema_core.permission_tags; delete deprecated tag rows

Revision ID: 20260321_0021
Revises: 20260321_0020
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0021"
down_revision = "20260321_0020"
branch_labels = None
depends_on = None

_TAG_SEEDS = [
    ("acc_update",   "Add and read finance updates (PO/invoice notes) on site detail."),
    ("billing",      "View PO and Invoice tabs on sidebar; add metadata within those and site detail page (PO number, invoice number, PO badge status, invoice badge status)"),
    ("doc_badge",    "View and update document badge fields: wcc_status, fsr_status, tx_copy_status, report_status"),
    ("field",        "Site metadata visible to fo user"),
    ("people",       "View People tab on sidebar, create users, edit metadata, activate/deactivate, reset password"),
    ("project",      "View Project tab on sidebar. Create and manage projects"),
    ("rate",         "View Rate Card tab on sidebar and add rates"),
    ("request",      "Create and cancel transaction requests"),
    ("role",         "Assign/remove roles from users"),
    ("site",         "View and edit site records including status badge transitions"),
    ("subproject",   "View and create subprojects"),
    ("ticket",       "View Tickets tab on sidebar; add and manage tickets"),
    ("transaction",  "View Transactions tab on sidebar; execute and reject transactions"),
    ("update",       "Add and read operational updates on site detail"),
    ("user",         "(deprecated — do not use, kept for migration reference only)"),
    ("assign_role",  "(deprecated — do not use, kept for migration reference only)"),
]


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Step 1 — Create schema_core.tags and seed
    # ------------------------------------------------------------------
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tag", sa.String(64), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        schema="schema_core",
    )
    op.execute(
        "INSERT INTO schema_core.tags (tag, description) VALUES "
        + ", ".join(f"('{tag}', $${desc}$$)" for tag, desc in _TAG_SEEDS)
    )

    # ------------------------------------------------------------------
    # Step 2 — Create schema_core.role_tags
    # ------------------------------------------------------------------
    op.create_table(
        "role_tags",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "role_id", sa.Integer,
            sa.ForeignKey("schema_hr.roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tag_id", sa.Integer,
            sa.ForeignKey("schema_core.tags.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("read",  sa.Boolean, nullable=False, server_default="false"),
        sa.Column("write", sa.Boolean, nullable=False, server_default="false"),
        sa.UniqueConstraint("role_id", "tag_id", name="uq_role_tags_role_tag"),
        schema="schema_core",
    )

    # ------------------------------------------------------------------
    # Step 3 — Migrate from permission_tags (exclude deprecated tags)
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
        SELECT pt.role_id, t.id, pt.read, pt.write
        FROM schema_core.permission_tags pt
        JOIN schema_core.tags t ON t.tag = pt.tag
        WHERE pt.tag NOT IN ('assign_role', 'user')
        """
    )

    # ------------------------------------------------------------------
    # Step 4 — Apply corrected permission matrix
    # ------------------------------------------------------------------

    # acc l1 (role 5) billing write was false — correct to true
    op.execute(
        """
        UPDATE schema_core.role_tags
        SET write = TRUE
        WHERE role_id = 5
          AND tag_id = (SELECT id FROM schema_core.tags WHERE tag = 'billing')
        """
    )

    # hr l1 (role 9) gets role read access (had assign_role R which is deprecated)
    op.execute(
        """
        INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
        SELECT 9, id, TRUE, FALSE
        FROM schema_core.tags
        WHERE tag = 'role'
        ON CONFLICT (role_id, tag_id) DO NOTHING
        """
    )

    # ------------------------------------------------------------------
    # Step 5 — Drop permission_tags; remove deprecated tag rows
    # ------------------------------------------------------------------
    op.drop_table("permission_tags", schema="schema_core")
    op.execute("DELETE FROM schema_core.tags WHERE tag IN ('assign_role', 'user')")


def downgrade() -> None:
    # Restore permission_tags from role_tags (joined back to tag strings)
    op.create_table(
        "permission_tags",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("role_id", sa.Integer, nullable=False),
        sa.Column("tag", sa.String(64), nullable=False),
        sa.Column("read",  sa.Boolean, nullable=False, server_default="false"),
        sa.Column("write", sa.Boolean, nullable=False, server_default="false"),
        schema="schema_core",
    )
    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write)
        SELECT rt.role_id, tg.tag, rt.read, rt.write
        FROM schema_core.role_tags rt
        JOIN schema_core.tags tg ON tg.id = rt.tag_id
        """
    )
    op.drop_table("role_tags", schema="schema_core")
    op.drop_table("tags", schema="schema_core")
