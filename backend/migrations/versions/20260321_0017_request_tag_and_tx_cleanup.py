"""request_tag_and_tx_cleanup: add request permission tag, remove transaction write from ops/fo, clean badge_transitions, drop soft-delete columns

Revision ID: 20260321_0017
Revises: 20260320_0016
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0017"
down_revision = "20260320_0016"
branch_labels = None
depends_on = None

# Role IDs (stable — seeded in initial migration):
# 1=mgmtl3, 2=mgmtl2, 3=mgmtl1, 4=accl2, 5=accl1
# 6=opsl3,  7=opsl2,  8=opsl1,  9=hrl1, 10=fol1


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. request tag — new tag gating transaction creation and cancellation
    #    mgmt l3: R+W | mgmt l2: R | mgmt l1: R
    #    acc l2: R    | acc l1: R
    #    ops l3: R+W  | ops l2: R+W | fo l1: R+W
    #    No row for ops l1 or hr l1
    # ------------------------------------------------------------------
    op.execute("DELETE FROM schema_core.permission_tags WHERE tag = 'request'")

    op.execute(
        """
        INSERT INTO schema_core.permission_tags (role_id, tag, read, write) VALUES
            (1,  'request', TRUE, TRUE),
            (2,  'request', TRUE, FALSE),
            (3,  'request', TRUE, FALSE),
            (4,  'request', TRUE, FALSE),
            (5,  'request', TRUE, FALSE),
            (6,  'request', TRUE, TRUE),
            (7,  'request', TRUE, TRUE),
            (10, 'request', TRUE, TRUE)
        """
    )

    # ------------------------------------------------------------------
    # 2. transaction tag — remove write from ops l3 and fo l1
    #    acc l1/l2 and mgmt l3 keep R+W unchanged
    # ------------------------------------------------------------------
    op.execute(
        """
        UPDATE schema_core.permission_tags
        SET write = FALSE
        WHERE tag = 'transaction'
          AND role_id IN (6, 10)
        """
    )

    # ------------------------------------------------------------------
    # 3. badge_transitions — ensure req→cancel is removed from schema_acc
    #    (was removed in migration 0014; idempotent here)
    # ------------------------------------------------------------------
    op.execute(
        """
        DELETE FROM schema_acc.badge_transitions
        WHERE from_id = (SELECT id FROM schema_core.badges WHERE key = 'req')
          AND to_id   = (SELECT id FROM schema_core.badges WHERE key = 'cancel')
        """
    )

    # ------------------------------------------------------------------
    # 4. Drop soft-delete columns from transactions
    #    Cancellation is now a plain status transition; deleted_at/deleted_by
    #    are no longer written or read by any backend code.
    # ------------------------------------------------------------------
    op.drop_column("transactions", "deleted_by", schema="schema_acc")
    op.drop_column("transactions", "deleted_at", schema="schema_acc")


def downgrade() -> None:
    # Restore soft-delete columns
    op.add_column(
        "transactions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, server_default=None),
        schema="schema_acc",
    )
    op.add_column(
        "transactions",
        sa.Column(
            "deleted_by",
            sa.Integer(),
            sa.ForeignKey("schema_hr.users.id"),
            nullable=True,
            server_default=None,
        ),
        schema="schema_acc",
    )

    # Remove request tag rows
    op.execute("DELETE FROM schema_core.permission_tags WHERE tag = 'request'")

    # Restore transaction write for ops l3 and fo l1
    op.execute(
        """
        UPDATE schema_core.permission_tags
        SET write = TRUE
        WHERE tag = 'transaction'
          AND role_id IN (6, 10)
        """
    )

    # Restore req→cancel in badge_transitions
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
