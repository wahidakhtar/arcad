"""perm_tag_and_active_fe: add perm_tag to ui_fields; add active_fe to sites; seed active_fe ui_field

Revision ID: 20260321_0022
Revises: 20260321_0021
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0022"
down_revision = "20260321_0021"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]
_PROJECT_KEYS = ["mi", "md", "ma", "mc", "bb"]

_BILLING_TAGS = (
    "budget", "cost", "paid", "balance",
    "po_number", "po_status", "invoice_number", "invoice_status",
    "last_recharge_date", "next_recharge_date", "active_po_number",
    "active_invoice_number", "active_invoice_status", "next_invoice_date",
)

_DOC_BADGE_TAGS = ("wcc_status", "fsr_status", "report_status", "doc_status")


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Step 1 — Add perm_tag column to ui_fields in all project schemas
    # ------------------------------------------------------------------
    for schema in _SCHEMAS:
        op.add_column(
            "ui_fields",
            sa.Column("perm_tag", sa.String(64), nullable=True),
            schema=schema,
        )
        billing_list = ", ".join(f"'{t}'" for t in _BILLING_TAGS)
        op.execute(sa.text(
            f"UPDATE {schema}.ui_fields SET perm_tag = 'billing' WHERE tag IN ({billing_list})"
        ))
        doc_badge_list = ", ".join(f"'{t}'" for t in _DOC_BADGE_TAGS)
        op.execute(sa.text(
            f"UPDATE {schema}.ui_fields SET perm_tag = 'doc_badge' WHERE tag IN ({doc_badge_list})"
        ))

    # ------------------------------------------------------------------
    # Step 2 — Add active_fe column to sites in all project schemas
    # ------------------------------------------------------------------
    for schema in _SCHEMAS:
        op.add_column(
            "sites",
            sa.Column("active_fe", sa.String(256), nullable=True),
            schema=schema,
        )

    # ------------------------------------------------------------------
    # Step 3 — Backfill active_fe from fe_assignment for non-BB schemas
    # ------------------------------------------------------------------
    for key in ("mi", "md", "ma", "mc"):
        op.execute(sa.text(
            f"""
            UPDATE schema_{key}.sites s
            SET active_fe = (
                SELECT u.label
                FROM schema_hr.users u
                JOIN schema_ops.fe_assignment fa ON fa.fe_id = u.id
                WHERE fa.site_id = s.id
                  AND fa.project_id = (SELECT id FROM schema_core.projects WHERE key = '{key}')
                  AND fa.active = TRUE
                ORDER BY fa.created_at DESC
                LIMIT 1
            )
            """
        ))

    # ------------------------------------------------------------------
    # Step 4 — Seed active_fe into ui_fields for all schemas
    # ------------------------------------------------------------------
    for schema in _SCHEMAS:
        op.execute(sa.text(
            f"""
            INSERT INTO {schema}.ui_fields (id, label, tag, list_view, type, form_view, bulk_view, section, perm_tag)
            SELECT COALESCE(MAX(id), 0) + 1, 'Active FE', 'active_fe', TRUE, 'text', FALSE, FALSE, 'site', NULL
            FROM {schema}.ui_fields
            WHERE tag != 'active_fe'
            """
        ))


def downgrade() -> None:
    for schema in _SCHEMAS:
        # Remove the active_fe ui_fields row
        op.execute(sa.text(f"DELETE FROM {schema}.ui_fields WHERE tag = 'active_fe'"))
        # Remove columns
        op.drop_column("ui_fields", "perm_tag", schema=schema)
        op.drop_column("sites", "active_fe", schema=schema)
