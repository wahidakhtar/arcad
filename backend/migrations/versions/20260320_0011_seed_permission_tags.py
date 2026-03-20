from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0011"
down_revision = "20260320_0010"
branch_labels = None
depends_on = None

# Migration 0011:
# Seed new permission tags: ticket, people, doc_badge
# Amendment 1: mgmtl3 (role 1) gets ALL new tags with read=true, write=true
# Amendment 2: rate_card tag NOT added (use existing 'rate' tag for Rate Card sidebar)
# Other roles follow design doc section A3

_NEW_ROWS = [
    # --- ticket tag ---
    # role 1 (mgmtl3): Amendment 1 — write=true
    {"role_id": 1, "tag": "ticket", "read": True, "write": True},
    {"role_id": 2, "tag": "ticket", "read": True, "write": True},
    {"role_id": 3, "tag": "ticket", "read": True, "write": False},
    {"role_id": 6, "tag": "ticket", "read": True, "write": True},
    {"role_id": 7, "tag": "ticket", "read": True, "write": True},
    {"role_id": 8, "tag": "ticket", "read": True, "write": False},
    # --- people tag ---
    # role 1 (mgmtl3): Amendment 1 — write=true
    {"role_id": 1, "tag": "people", "read": True, "write": True},
    {"role_id": 2, "tag": "people", "read": True, "write": True},
    {"role_id": 3, "tag": "people", "read": True, "write": False},
    {"role_id": 9, "tag": "people", "read": True, "write": True},
    # --- doc_badge tag ---
    # role 1 (mgmtl3): Amendment 1 — write=true (overrides design doc write=false)
    {"role_id": 1, "tag": "doc_badge", "read": True, "write": True},
    {"role_id": 2, "tag": "doc_badge", "read": True, "write": False},
    {"role_id": 3, "tag": "doc_badge", "read": True, "write": False},
    {"role_id": 4, "tag": "doc_badge", "read": True, "write": False},
    {"role_id": 5, "tag": "doc_badge", "read": True, "write": False},
    {"role_id": 6, "tag": "doc_badge", "read": True, "write": True},
    {"role_id": 7, "tag": "doc_badge", "read": True, "write": True},
    {"role_id": 8, "tag": "doc_badge", "read": True, "write": True},
    {"role_id": 9, "tag": "doc_badge", "read": True, "write": False},
    # FO (role 10) gets no doc_badge, ticket, or people tag
]


def upgrade() -> None:
    conn = op.get_bind()

    # Advance the sequence past the 62 rows that were seeded with explicit IDs
    conn.execute(
        sa.text("SELECT setval('schema_core.permission_tags_id_seq', (SELECT MAX(id) FROM schema_core.permission_tags))")
    )

    pt_table = sa.table(
        "permission_tags",
        sa.column("role_id", sa.Integer()),
        sa.column("tag", sa.String()),
        sa.column("read", sa.Boolean()),
        sa.column("write", sa.Boolean()),
        schema="schema_core",
    )
    op.bulk_insert(pt_table, _NEW_ROWS)


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM schema_core.permission_tags WHERE tag IN ('ticket', 'people', 'doc_badge')"
        )
    )
