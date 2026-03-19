from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260319_0005"
down_revision = "20260319_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create badge_transitions table in schema_acc (mirrors project schema structure)
    op.create_table(
        "badge_transitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type_id", sa.Integer(), sa.ForeignKey("schema_core.transition_types.id"), nullable=False),
        sa.Column("from_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("to_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        schema="schema_acc",
    )

    # Seed req→cancel, req→rej, req→exct using key lookups (portable across environments)
    op.execute(
        """
        DO $$
        DECLARE
            transaction_type_id integer;
            req_id integer;
            cancel_id integer;
            rej_id integer;
            exct_id integer;
        BEGIN
            SELECT id INTO transaction_type_id FROM schema_core.transition_types WHERE key = 'transaction';
            SELECT id INTO req_id    FROM schema_core.badges WHERE key = 'req';
            SELECT id INTO cancel_id FROM schema_core.badges WHERE key = 'cancel';
            SELECT id INTO rej_id    FROM schema_core.badges WHERE key = 'rej';
            SELECT id INTO exct_id   FROM schema_core.badges WHERE key = 'exct';

            INSERT INTO schema_acc.badge_transitions (id, type_id, from_id, to_id) VALUES
                (1, transaction_type_id, req_id, cancel_id),
                (2, transaction_type_id, req_id, rej_id),
                (3, transaction_type_id, req_id, exct_id)
            ON CONFLICT DO NOTHING;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_table("badge_transitions", schema="schema_acc")
