"""Update badge colors: pink→#FD0000, yellow→#F3C214, green→#F3C214, rect→#0AACE8

Revision ID: 20260405_0059
Revises: 20260404_0058
Create Date: 2026-04-05
"""
from __future__ import annotations

from alembic import op

revision = "20260405_0059"
down_revision = "20260404_0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Pink (#F2D0D3) → red #FD0000  (cancel, pend, exp)
    op.execute("UPDATE schema_core.badges SET color = '#FD0000' WHERE key IN ('cancel', 'pend', 'exp')")

    # Yellow shades (#F1CA00, #FEFE01) → standardised #F3C214  (p_iss, a_wait, hold)
    # term is already #F3C214 — no change needed
    op.execute("UPDATE schema_core.badges SET color = '#F3C214' WHERE key IN ('p_iss', 'a_wait', 'hold')")

    # Green (#92D050) → #F3C214  (all green badges in initial seed + exct from migration 0018)
    op.execute(
        "UPDATE schema_core.badges SET color = '#F3C214' "
        "WHERE key IN ('live', 'comp', 'rec', 'set', 'sign', 'shr', 'act', 'exct')"
    )

    # Rectification (#E3EDD2) → #0AACE8
    op.execute("UPDATE schema_core.badges SET color = '#0AACE8' WHERE key = 'rect'")


def downgrade() -> None:
    op.execute("UPDATE schema_core.badges SET color = '#F2D0D3' WHERE key IN ('cancel', 'pend', 'exp')")
    op.execute("UPDATE schema_core.badges SET color = '#F1CA00' WHERE key = 'p_iss'")
    op.execute("UPDATE schema_core.badges SET color = '#FEFE01' WHERE key IN ('a_wait', 'hold')")
    op.execute(
        "UPDATE schema_core.badges SET color = '#92D050' "
        "WHERE key IN ('live', 'comp', 'rec', 'set', 'sign', 'shr', 'act', 'exct')"
    )
    op.execute("UPDATE schema_core.badges SET color = '#E3EDD2' WHERE key = 'rect'")
