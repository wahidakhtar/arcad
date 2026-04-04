"""Add subm badge, report_submission_date column+field for MA/MC, fix gen→subm transitions

Revision ID: 20260405_0060
Revises: 20260405_0059
Create Date: 2026-04-05

Changes:
1. Add doc_status badge: subm (Submitted, #0AACE8)
2. Add report_submission_date column to schema_ma.sites and schema_mc.sites
3. Add report_submission_date ui_field to MA and MC (doc_badge tag)
4. Fix report badge transitions: replace gen(23)→shr(27) with gen(23)→subm for MA and MC
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260405_0060"
down_revision = "20260405_0059"
branch_labels = None
depends_on = None

_REPORT_TYPE_ID = 3
_GEN_ID = 23
_SHR_ID = 27


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add subm badge
    conn.execute(sa.text(
        "INSERT INTO schema_core.badges (type, key, label, color) "
        "VALUES ('doc_status', 'subm', 'Submitted', '#0AACE8') "
        "ON CONFLICT (key) DO NOTHING"
    ))
    subm_id = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'subm'")
    ).scalar_one()

    # 2. Add report_submission_date column to MA and MC sites
    op.add_column(
        "sites",
        sa.Column("report_submission_date", sa.Date(), nullable=True),
        schema="schema_ma",
    )
    op.add_column(
        "sites",
        sa.Column("report_submission_date", sa.Date(), nullable=True),
        schema="schema_mc",
    )

    # 3. Add report_submission_date ui_field to MA (order 51, after report_status at 50)
    conn.execute(sa.text(
        "SELECT setval('schema_ma.ui_fields_id_seq', "
        "(SELECT COALESCE(MAX(id), 0) FROM schema_ma.ui_fields))"
    ))
    conn.execute(sa.text(
        "INSERT INTO schema_ma.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'report_submission_date', 'Report Submission Date', 'date', false, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'doc_badge'), 51 "
        "WHERE NOT EXISTS (SELECT 1 FROM schema_ma.ui_fields WHERE key = 'report_submission_date')"
    ))

    # 4. Add report_submission_date ui_field to MC (order 51)
    conn.execute(sa.text(
        "SELECT setval('schema_mc.ui_fields_id_seq', "
        "(SELECT COALESCE(MAX(id), 0) FROM schema_mc.ui_fields))"
    ))
    conn.execute(sa.text(
        "INSERT INTO schema_mc.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'report_submission_date', 'Report Submission Date', 'date', false, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'doc_badge'), 51 "
        "WHERE NOT EXISTS (SELECT 1 FROM schema_mc.ui_fields WHERE key = 'report_submission_date')"
    ))

    # 5. Fix MA report badge transitions: gen→shr becomes gen→subm
    conn.execute(sa.text(
        f"DELETE FROM schema_ma.badge_transitions "
        f"WHERE type_id = {_REPORT_TYPE_ID} AND from_id = {_GEN_ID} AND to_id = {_SHR_ID}"
    ))
    conn.execute(sa.text(
        f"SELECT setval('schema_ma.badge_transitions_id_seq', "
        f"(SELECT COALESCE(MAX(id), 0) FROM schema_ma.badge_transitions))"
    ))
    conn.execute(sa.text(
        f"INSERT INTO schema_ma.badge_transitions (type_id, from_id, to_id) "
        f"VALUES ({_REPORT_TYPE_ID}, {_GEN_ID}, {subm_id})"
    ))

    # 6. Fix MC report badge transitions: gen→shr becomes gen→subm
    conn.execute(sa.text(
        f"DELETE FROM schema_mc.badge_transitions "
        f"WHERE type_id = {_REPORT_TYPE_ID} AND from_id = {_GEN_ID} AND to_id = {_SHR_ID}"
    ))
    conn.execute(sa.text(
        f"SELECT setval('schema_mc.badge_transitions_id_seq', "
        f"(SELECT COALESCE(MAX(id), 0) FROM schema_mc.badge_transitions))"
    ))
    conn.execute(sa.text(
        f"INSERT INTO schema_mc.badge_transitions (type_id, from_id, to_id) "
        f"VALUES ({_REPORT_TYPE_ID}, {_GEN_ID}, {subm_id})"
    ))


def downgrade() -> None:
    conn = op.get_bind()

    subm_row = conn.execute(
        sa.text("SELECT id FROM schema_core.badges WHERE key = 'subm'")
    ).fetchone()
    subm_id = subm_row[0] if subm_row else None

    # Restore gen→shr transitions for MA and MC
    if subm_id is not None:
        for schema in ("schema_ma", "schema_mc"):
            conn.execute(sa.text(
                f"DELETE FROM {schema}.badge_transitions "
                f"WHERE type_id = {_REPORT_TYPE_ID} AND from_id = {_GEN_ID} AND to_id = :subm_id"
            ), {"subm_id": subm_id})
            conn.execute(sa.text(
                f"INSERT INTO {schema}.badge_transitions (type_id, from_id, to_id) "
                f"VALUES ({_REPORT_TYPE_ID}, {_GEN_ID}, {_SHR_ID})"
            ))

    # Remove ui_fields
    conn.execute(sa.text("DELETE FROM schema_ma.ui_fields WHERE key = 'report_submission_date'"))
    conn.execute(sa.text("DELETE FROM schema_mc.ui_fields WHERE key = 'report_submission_date'"))

    # Drop columns
    op.drop_column("sites", "report_submission_date", schema="schema_ma")
    op.drop_column("sites", "report_submission_date", schema="schema_mc")

    # Remove subm badge
    conn.execute(sa.text("DELETE FROM schema_core.badges WHERE key = 'subm'"))
