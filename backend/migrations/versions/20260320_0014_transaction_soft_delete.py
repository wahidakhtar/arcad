from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0014"
down_revision = "20260320_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add soft-delete columns to transactions
    op.add_column(
        "transactions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, server_default=None),
        schema="schema_acc",
    )
    op.add_column(
        "transactions",
        sa.Column("deleted_by", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=True, server_default=None),
        schema="schema_acc",
    )

    # Remove req → cancel from badge_transitions (cancellation now via soft-delete only)
    op.execute(
        """
        DELETE FROM schema_acc.badge_transitions
        WHERE from_id = (SELECT id FROM schema_core.badges WHERE key = 'req')
          AND to_id   = (SELECT id FROM schema_core.badges WHERE key = 'cancel')
        """
    )


def downgrade() -> None:
    op.drop_column("transactions", "deleted_by", schema="schema_acc")
    op.drop_column("transactions", "deleted_at", schema="schema_acc")
    # Re-insert the req → cancel transition on downgrade
    op.execute(
        """
        DO $$
        DECLARE
            transaction_type_id integer;
            req_id integer;
            cancel_id integer;
        BEGIN
            SELECT id INTO transaction_type_id FROM schema_core.transition_types WHERE key = 'transaction';
            SELECT id INTO req_id    FROM schema_core.badges WHERE key = 'req';
            SELECT id INTO cancel_id FROM schema_core.badges WHERE key = 'cancel';
            INSERT INTO schema_acc.badge_transitions (type_id, from_id, to_id) VALUES
                (transaction_type_id, req_id, cancel_id)
            ON CONFLICT DO NOTHING;
        END $$;
        """
    )
