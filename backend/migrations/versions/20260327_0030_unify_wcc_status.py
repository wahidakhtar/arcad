"""Unify doc badge to wcc_status_id: MA rename fsr→wcc + drop report, MC drop report, MD drop doc_status, clean badge_transitions, clean ui_fields

Revision ID: 20260327_0030
Revises: 20260327_0029
Create Date: 2026-03-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260327_0030"
down_revision = "20260327_0029"
branch_labels = None
depends_on = None

# transition_type ids
_WCC_TYPE_ID = 1
_FSR_TYPE_ID = 2
_REPORT_TYPE_ID = 3

# badge ids (doc_status)
_PEND_ID = 21
_SIGN_ID = 26


def upgrade() -> None:
    # --- MA sites: rename fsr_status_id → wcc_status_id, drop report_status_id ---
    op.alter_column("sites", "fsr_status_id", new_column_name="wcc_status_id", schema="schema_ma")
    op.drop_column("sites", "report_status_id", schema="schema_ma")

    # --- MC sites: drop report_status_id ---
    op.drop_column("sites", "report_status_id", schema="schema_mc")

    # --- MD sites: drop doc_status_id (wcc_status_id already exists) ---
    op.drop_column("sites", "doc_status_id", schema="schema_md")

    # --- MA badge_transitions: add wcc (pend→sign), remove fsr and report ---
    op.execute("SELECT setval('schema_ma.badge_transitions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM schema_ma.badge_transitions))")
    op.execute(
        f"INSERT INTO schema_ma.badge_transitions (type_id, from_id, to_id) "
        f"VALUES ({_WCC_TYPE_ID}, {_PEND_ID}, {_SIGN_ID})"
    )
    op.execute(f"DELETE FROM schema_ma.badge_transitions WHERE type_id IN ({_FSR_TYPE_ID}, {_REPORT_TYPE_ID})")

    # --- MC badge_transitions: remove report ---
    op.execute(f"DELETE FROM schema_mc.badge_transitions WHERE type_id = {_REPORT_TYPE_ID}")

    # --- MA ui_fields: rename fsr_status → wcc_status, remove report_status ---
    op.execute("UPDATE schema_ma.ui_fields SET key = 'wcc_status', label = 'WCC Status' WHERE key = 'fsr_status'")
    op.execute("DELETE FROM schema_ma.ui_fields WHERE key = 'report_status'")

    # --- MC ui_fields: remove report_status ---
    op.execute("DELETE FROM schema_mc.ui_fields WHERE key = 'report_status'")

    # --- MD ui_fields: rename doc_status → wcc_status, remove tx_copy_status ---
    op.execute("UPDATE schema_md.ui_fields SET key = 'wcc_status', label = 'WCC Status' WHERE key = 'doc_status'")
    op.execute("DELETE FROM schema_md.ui_fields WHERE key = 'tx_copy_status'")


def downgrade() -> None:
    # MD ui_fields
    op.execute("UPDATE schema_md.ui_fields SET key = 'doc_status', label = 'Tx Copy / WCC' WHERE key = 'wcc_status'")

    # MC ui_fields
    op.execute(
        "INSERT INTO schema_mc.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'report_status', 'Report Status', 'badge', true, false, false, tag_id, 19 "
        "FROM schema_mc.ui_fields WHERE key = 'wcc_status' LIMIT 1"
    )

    # MA ui_fields
    op.execute("UPDATE schema_ma.ui_fields SET key = 'fsr_status', label = 'FSR Status' WHERE key = 'wcc_status'")
    op.execute(
        "INSERT INTO schema_ma.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'report_status', 'Report Status', 'badge', true, false, false, tag_id, 18 "
        "FROM schema_ma.ui_fields WHERE key = 'fsr_status' LIMIT 1"
    )

    # MC badge_transitions: restore report
    op.execute(
        f"INSERT INTO schema_mc.badge_transitions (type_id, from_id, to_id) VALUES "
        f"({_REPORT_TYPE_ID}, {_PEND_ID}, 23), ({_REPORT_TYPE_ID}, 23, 27)"
    )

    # MA badge_transitions: restore fsr + report, remove wcc
    op.execute(
        f"INSERT INTO schema_ma.badge_transitions (type_id, from_id, to_id) VALUES "
        f"({_FSR_TYPE_ID}, {_PEND_ID}, {_SIGN_ID}), "
        f"({_REPORT_TYPE_ID}, {_PEND_ID}, 23), ({_REPORT_TYPE_ID}, 23, 27)"
    )
    op.execute(f"DELETE FROM schema_ma.badge_transitions WHERE type_id = {_WCC_TYPE_ID}")

    # MD sites: restore doc_status_id
    op.add_column("sites", sa.Column("doc_status_id", sa.Integer, sa.ForeignKey("schema_core.badges.id"), nullable=True), schema="schema_md")

    # MC sites: restore report_status_id
    op.add_column("sites", sa.Column("report_status_id", sa.Integer, sa.ForeignKey("schema_core.badges.id"), nullable=True), schema="schema_mc")

    # MA sites: rename wcc_status_id → fsr_status_id, restore report_status_id
    op.alter_column("sites", "wcc_status_id", new_column_name="fsr_status_id", schema="schema_ma")
    op.add_column("sites", sa.Column("report_status_id", sa.Integer, sa.ForeignKey("schema_core.badges.id"), nullable=True), schema="schema_ma")
