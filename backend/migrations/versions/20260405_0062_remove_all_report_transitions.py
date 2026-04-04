"""Remove all manual badge_transitions for report_status on MA and MC

Revision ID: 20260405_0062
Revises: 20260405_0061
Create Date: 2026-04-05

Report status is fully system-driven:
  pend → gen   via POST /sites/{key}/{id}/generate-report  (button)
  gen  → shr   via PATCH report_submission_date             (date modal)

No dropdown transitions should exist — this removes the remaining pend→gen row
that was seeded in migration 0057 for both MA and MC.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260405_0062"
down_revision = "20260405_0061"
branch_labels = None
depends_on = None

_REPORT_TYPE_ID = 3


def upgrade() -> None:
    conn = op.get_bind()
    for schema in ("schema_ma", "schema_mc"):
        conn.execute(sa.text(
            f"DELETE FROM {schema}.badge_transitions WHERE type_id = :rt"
        ), {"rt": _REPORT_TYPE_ID})


def downgrade() -> None:
    conn = op.get_bind()
    pend_id = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'pend'")
    ).scalar_one()
    gen_id = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'gen'")
    ).scalar_one()
    for schema in ("schema_ma", "schema_mc"):
        conn.execute(sa.text(
            f"SELECT setval('{schema}.badge_transitions_id_seq', "
            f"(SELECT COALESCE(MAX(id), 0) FROM {schema}.badge_transitions))"
        ))
        conn.execute(sa.text(
            f"INSERT INTO {schema}.badge_transitions (type_id, from_id, to_id) "
            f"VALUES (:rt, :pend, :gen)"
        ), {"rt": _REPORT_TYPE_ID, "pend": pend_id, "gen": gen_id})
