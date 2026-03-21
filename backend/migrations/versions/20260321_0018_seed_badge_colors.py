"""seed_badge_colors: set color on req and exct badges

Revision ID: 20260321_0018
Revises: 20260321_0017
Create Date: 2026-03-21
"""
from __future__ import annotations

from alembic import op

revision = "20260321_0018"
down_revision = "20260321_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE schema_core.badges SET color = '#0AACE8' WHERE key = 'req'")
    op.execute("UPDATE schema_core.badges SET color = '#92D050' WHERE key = 'exct'")


def downgrade() -> None:
    op.execute("UPDATE schema_core.badges SET color = NULL WHERE key = 'req'")
    op.execute("UPDATE schema_core.badges SET color = NULL WHERE key = 'exct'")
