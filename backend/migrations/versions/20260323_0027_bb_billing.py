"""bb_billing: valid_from/valid_to on pos, period cols on invoices, next_recharge_date, po_status badges

Revision ID: 20260323_0027
Revises: 20260322_0026
Create Date: 2026-03-23
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260323_0027"
down_revision = "20260322_0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # schema_acc.pos — BB activation window
    # ------------------------------------------------------------------
    op.add_column("pos", sa.Column("valid_from", sa.Date(), nullable=True), schema="schema_acc")
    op.add_column("pos", sa.Column("valid_to", sa.Date(), nullable=True), schema="schema_acc")

    # ------------------------------------------------------------------
    # schema_acc.invoices — quarterly period range
    # ------------------------------------------------------------------
    op.add_column("invoices", sa.Column("period_from", sa.Date(), nullable=True), schema="schema_acc")
    op.add_column("invoices", sa.Column("period_to", sa.Date(), nullable=True), schema="schema_acc")

    # ------------------------------------------------------------------
    # schema_bb.recharges — calculated next recharge date
    # ------------------------------------------------------------------
    op.add_column("recharges", sa.Column("next_recharge_date", sa.Date(), nullable=True), schema="schema_bb")

    # ------------------------------------------------------------------
    # schema_core.badges — po_status type badges
    # ------------------------------------------------------------------
    conn = op.get_bind()

    def seed_badge(type_: str, key: str, label: str, color: str | None = None) -> None:
        exists = conn.execute(
            sa.text("SELECT 1 FROM schema_core.badges WHERE type = :t AND key = :k"),
            {"t": type_, "k": key},
        ).scalar_one_or_none()
        if exists is None:
            conn.execute(
                sa.text(
                    "INSERT INTO schema_core.badges (type, key, label, color) VALUES (:t, :k, :l, :c)"
                ),
                {"t": type_, "k": key, "l": label, "c": color},
            )

    seed_badge("po_status", "po_exp", "Expired", "#F2D0D3")
    seed_badge("po_status", "npa", "New PO Awaited", "#93DCF9")
    seed_badge("doc_status", "canc", "Cancelled", "#F2D0D3")


def downgrade() -> None:
    op.drop_column("invoices", "period_to", schema="schema_acc")
    op.drop_column("invoices", "period_from", schema="schema_acc")
    op.drop_column("pos", "valid_to", schema="schema_acc")
    op.drop_column("pos", "valid_from", schema="schema_acc")
    op.drop_column("recharges", "next_recharge_date", schema="schema_bb")
    # badges are data; downgrade leaves them in place
