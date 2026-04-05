"""Fix badge colors: greens→#008000, a_wait→#93DCF9; drop subm badge; remove gen→subm transitions

Revision ID: 20260405_0061
Revises: 20260405_0060
Create Date: 2026-04-05

Changes:
1. exct, act, shr, sign, set, rec, comp, live → #008000
2. a_wait (#FEFE01 → already set to #F3C214 in 0059) → #93DCF9
3. Drop subm badge added in migration 0060
4. Remove gen→subm badge transitions from MA and MC (report type, added in 0060)
   Net result: only pend→gen remains for report_status on MA/MC
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260405_0061"
down_revision = "20260405_0060"
branch_labels = None
depends_on = None

_REPORT_TYPE_ID = 3
_GEN_ID = 23


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Greens → #008000
    op.execute(
        "UPDATE schema_core.badges SET color = '#008000' "
        "WHERE key IN ('exct', 'act', 'shr', 'sign', 'set', 'rec', 'comp', 'live')"
    )

    # 2. a_wait → #93DCF9
    op.execute("UPDATE schema_core.badges SET color = '#93DCF9' WHERE key = 'a_wait'")

    # 3. Remove gen→subm transitions from MA and MC
    subm_row = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'subm'")
    ).fetchone()
    if subm_row:
        subm_id = subm_row[0]
        for schema in ("schema_ma", "schema_mc"):
            conn.execute(sa.text(
                f"DELETE FROM {schema}.badge_transitions "
                f"WHERE type_id = :rt AND from_id = :gen AND to_id = :subm"
            ), {"rt": _REPORT_TYPE_ID, "gen": _GEN_ID, "subm": subm_id})

    # 4. Drop subm badge — first clear any FK references in sites tables
    if subm_row:
        for schema in ("schema_ma", "schema_mc"):
            conn.execute(sa.text(
                f"UPDATE {schema}.sites SET report_status_id = NULL "
                f"WHERE report_status_id = :subm"
            ), {"subm": subm_id})
    conn.execute(sa.text("DELETE FROM schema_core.badges WHERE key = 'subm'"))


def downgrade() -> None:
    conn = op.get_bind()

    # Restore previous colors
    op.execute(
        "UPDATE schema_core.badges SET color = '#F3C214' "
        "WHERE key IN ('exct', 'act', 'shr', 'sign', 'set', 'rec', 'comp', 'live')"
    )
    op.execute("UPDATE schema_core.badges SET color = '#F3C214' WHERE key = 'a_wait'")

    # Re-add subm badge and gen→subm transitions
    conn.execute(sa.text(
        "INSERT INTO schema_core.badges (type, key, label, color) "
        "VALUES ('doc_status', 'subm', 'Submitted', '#0AACE8') ON CONFLICT (key) DO NOTHING"
    ))
    subm_id = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'subm'")
    ).scalar_one()
    for schema in ("schema_ma", "schema_mc"):
        conn.execute(sa.text(
            f"INSERT INTO {schema}.badge_transitions (type_id, from_id, to_id) "
            f"VALUES (:rt, :gen, :subm)"
        ), {"rt": _REPORT_TYPE_ID, "gen": _GEN_ID, "subm": subm_id})
