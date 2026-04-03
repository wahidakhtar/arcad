from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260403_0057"
down_revision = "20260403_0056"
branch_labels = None
depends_on = None

# What this migration does:
#
# 1. Fix wcc_status.tag_id for MI, MA, MC, MD: migration 0029 set it to 'finance'
#    (because the field's section was 'finance' in 0007). 'finance' has no role_tags
#    entries, so the badge was invisible to everyone. Correct tag: 'doc_badge'.
#
# 2. Rename MA wcc_status label "WCC Status" → "FSR" (this field tracks the
#    Final Site Report / FSR document, not the WCC).
#
# 3. Re-add report_status_id column to schema_ma.sites and schema_mc.sites
#    (was dropped in migration 0030). Badge transitions (type_id=3) also restored.
#
# 4. Add scrap_value + dismantle_date ui_fields to schema_md so they appear on
#    the detail page. dismantle_date insert is guarded by NOT EXISTS in case a
#    prior migration already added it.

_WCC_SCHEMAS = ["schema_mi", "schema_ma", "schema_mc", "schema_md"]
_REPORT_TYPE_ID = 3
_PEND_ID = 21


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Fix wcc_status.tag_id: finance → doc_badge
    for schema in _WCC_SCHEMAS:
        conn.execute(sa.text(
            f"UPDATE {schema}.ui_fields "
            f"SET tag_id = (SELECT id FROM schema_core.tags WHERE tag = 'doc_badge') "
            f"WHERE key = 'wcc_status'"
        ))

    # 2. MA wcc_status label → "FSR"
    conn.execute(sa.text(
        "UPDATE schema_ma.ui_fields SET label = 'FSR' WHERE key = 'wcc_status'"
    ))

    # 3. Add report_status_id to MA sites
    op.add_column(
        "sites",
        sa.Column("report_status_id", sa.Integer, sa.ForeignKey("schema_core.badges.id"), nullable=True),
        schema="schema_ma",
    )

    # 4. Add report_status_id to MC sites
    op.add_column(
        "sites",
        sa.Column("report_status_id", sa.Integer, sa.ForeignKey("schema_core.badges.id"), nullable=True),
        schema="schema_mc",
    )

    # 5. Add report_status ui_field to MA
    conn.execute(sa.text(
        "INSERT INTO schema_ma.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "VALUES ('report_status', 'Report', 'badge', true, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'doc_badge'), 50)"
    ))

    # 6. Add report_status ui_field to MC
    conn.execute(sa.text(
        "INSERT INTO schema_mc.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "VALUES ('report_status', 'Report', 'badge', true, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'doc_badge'), 50)"
    ))

    # 7. Report badge transitions for MA (pend→submitted, submitted→signed)
    conn.execute(sa.text(
        "SELECT setval('schema_ma.badge_transitions_id_seq', "
        "(SELECT COALESCE(MAX(id), 0) FROM schema_ma.badge_transitions))"
    ))
    conn.execute(sa.text(
        f"INSERT INTO schema_ma.badge_transitions (type_id, from_id, to_id) VALUES "
        f"({_REPORT_TYPE_ID}, {_PEND_ID}, 23), ({_REPORT_TYPE_ID}, 23, 27)"
    ))

    # 8. Report badge transitions for MC
    conn.execute(sa.text(
        "SELECT setval('schema_mc.badge_transitions_id_seq', "
        "(SELECT COALESCE(MAX(id), 0) FROM schema_mc.badge_transitions))"
    ))
    conn.execute(sa.text(
        f"INSERT INTO schema_mc.badge_transitions (type_id, from_id, to_id) VALUES "
        f"({_REPORT_TYPE_ID}, {_PEND_ID}, 23), ({_REPORT_TYPE_ID}, 23, 27)"
    ))

    # 9. Add dismantle_date ui_field to MD (guard: may already exist)
    conn.execute(sa.text(
        "INSERT INTO schema_md.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'dismantle_date', 'Dismantle Date', 'date', false, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'site'), 40 "
        "WHERE NOT EXISTS (SELECT 1 FROM schema_md.ui_fields WHERE key = 'dismantle_date')"
    ))

    # 10. Add scrap_value ui_field to MD
    conn.execute(sa.text(
        "INSERT INTO schema_md.ui_fields (key, label, type, list_view, form_view, bulk_view, tag_id, \"order\") "
        "SELECT 'scrap_value', 'Scrap Value', 'number', false, false, false, "
        "(SELECT id FROM schema_core.tags WHERE tag = 'site'), 41 "
        "WHERE NOT EXISTS (SELECT 1 FROM schema_md.ui_fields WHERE key = 'scrap_value')"
    ))


def downgrade() -> None:
    conn = op.get_bind()

    # Remove MD scrap_value and dismantle_date ui_fields
    conn.execute(sa.text("DELETE FROM schema_md.ui_fields WHERE key = 'scrap_value'"))
    conn.execute(sa.text("DELETE FROM schema_md.ui_fields WHERE key = 'dismantle_date'"))

    # Remove report badge transitions
    conn.execute(sa.text(f"DELETE FROM schema_mc.badge_transitions WHERE type_id = {_REPORT_TYPE_ID}"))
    conn.execute(sa.text(f"DELETE FROM schema_ma.badge_transitions WHERE type_id = {_REPORT_TYPE_ID}"))

    # Remove report_status ui_fields
    conn.execute(sa.text("DELETE FROM schema_mc.ui_fields WHERE key = 'report_status'"))
    conn.execute(sa.text("DELETE FROM schema_ma.ui_fields WHERE key = 'report_status'"))

    # Drop report_status_id columns
    op.drop_column("sites", "report_status_id", schema="schema_mc")
    op.drop_column("sites", "report_status_id", schema="schema_ma")

    # Revert MA wcc_status label
    conn.execute(sa.text("UPDATE schema_ma.ui_fields SET label = 'WCC Status' WHERE key = 'wcc_status'"))

    # Revert wcc_status tag_id back to finance
    for schema in _WCC_SCHEMAS:
        conn.execute(sa.text(
            f"UPDATE {schema}.ui_fields "
            f"SET tag_id = (SELECT id FROM schema_core.tags WHERE tag = 'finance') "
            f"WHERE key = 'wcc_status'"
        ))
