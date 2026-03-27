"""merge_branch_a_and_b

Revision ID: ad6b8dcc498c
Revises: 3971358f45db, 20260327_0031
Create Date: 2026-03-28 00:08:05.007370
"""

from alembic import op
import sqlalchemy as sa

revision = "ad6b8dcc498c"
down_revision = ("3971358f45db", "20260327_0031")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
