"""clean_project_tx_transitions: remove transaction-type rows from project schemas' badge_transitions

Transaction transitions belong exclusively in schema_acc.badge_transitions.
The project schemas (mi, md, ma, mc) had stale rows (req→cancel, req→exct)
that were overriding the correct schema_acc data.

Revision ID: 20260321_0020
Revises: 20260321_0019
Create Date: 2026-03-21
"""
from __future__ import annotations

from alembic import op

revision = "20260321_0020"
down_revision = "20260321_0019"
branch_labels = None
depends_on = None

_PROJECT_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc"]


def upgrade() -> None:
    for schema in _PROJECT_SCHEMAS:
        op.execute(
            f"""
            DELETE FROM {schema}.badge_transitions
            WHERE type_id = (SELECT id FROM schema_core.transition_types WHERE key = 'transaction')
            """
        )


def downgrade() -> None:
    # Restore the original stale rows (req→cancel, req→exct) to project schemas.
    # schema_acc remains the authoritative source; these are restored only for
    # rollback completeness.
    for schema in _PROJECT_SCHEMAS:
        op.execute(
            f"""
            INSERT INTO {schema}.badge_transitions (type_id, from_id, to_id)
            SELECT tt.id, f.id, t.id
            FROM schema_core.transition_types tt,
                 schema_core.badges f,
                 schema_core.badges t
            WHERE tt.key = 'transaction'
              AND f.key  = 'req'
              AND t.key  IN ('cancel', 'exct')
            ON CONFLICT DO NOTHING
            """
        )
