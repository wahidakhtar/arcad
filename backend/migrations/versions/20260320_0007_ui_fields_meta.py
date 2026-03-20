from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0007"
down_revision = "20260320_0006"
branch_labels = None
depends_on = None

_SCHEMAS = ["schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb"]

# Fields that appear in the add-site form per project (tag values)
_FORM_FIELDS: dict[str, set[str]] = {
    "mi": {"receiving_date", "ckt_id", "customer", "address", "city", "height"},
    "md": {"receiving_date", "ckt_id", "customer", "address", "state_id", "height"},
    "ma": {"receiving_date", "ckt_id", "customer", "address", "state_id", "height"},
    "mc": {"receiving_date", "ckt_id", "customer", "address", "state_id", "height", "lc", "audit_date", "mpaint", "mnbr", "arr", "ep", "ec"},
    "bb": {"receiving_date", "ckt_id", "customer", "address", "city", "lc"},
}

# Fields that appear in bulk subproject upload per project (tag values)
_BULK_FIELDS: dict[str, set[str]] = {
    "mi": {"ckt_id", "customer", "address", "city", "height"},
    "md": {"ckt_id", "customer", "address", "state_id", "height"},
    "ma": {"ckt_id", "customer", "address", "state_id", "height"},
    "mc": {"ckt_id", "customer", "address", "state_id", "height", "lc", "audit_date", "mpaint", "mnbr", "arr", "ep", "ec"},
    "bb": set(),
}

# Finance/billing fields always get section='finance' regardless of project
_FINANCE_TAGS = {
    "wcc_status", "fsr_status", "report_status",
    "budget", "cost", "paid", "balance",
    "po_number", "po_status", "invoice_number", "invoice_status",
    "doc_status", "wcc_status_id", "doc_status_id",
}

# Projects that support subproject bulk upload
_SUPPORTS_SUBPROJECTS = {"md", "ma", "mc"}


def upgrade() -> None:
    # Add form_view, bulk_view, section to each project ui_fields table
    for schema in _SCHEMAS:
        op.add_column("ui_fields", sa.Column("form_view", sa.Boolean(), nullable=False, server_default=sa.false()), schema=schema)
        op.add_column("ui_fields", sa.Column("bulk_view", sa.Boolean(), nullable=False, server_default=sa.false()), schema=schema)
        op.add_column("ui_fields", sa.Column("section", sa.String(length=32), nullable=False, server_default="site"), schema=schema)
        op.alter_column("ui_fields", "form_view", server_default=None, schema=schema)
        op.alter_column("ui_fields", "bulk_view", server_default=None, schema=schema)
        op.alter_column("ui_fields", "section", server_default=None, schema=schema)

        project_key = schema.replace("schema_", "")
        form_tags = _FORM_FIELDS[project_key]
        bulk_tags = _BULK_FIELDS[project_key]

        if form_tags:
            form_list = ", ".join(f"'{t}'" for t in form_tags)
            op.execute(sa.text(f"UPDATE {schema}.ui_fields SET form_view = true WHERE tag IN ({form_list})"))

        if bulk_tags:
            bulk_list = ", ".join(f"'{t}'" for t in bulk_tags)
            op.execute(sa.text(f"UPDATE {schema}.ui_fields SET bulk_view = true WHERE tag IN ({bulk_list})"))

        finance_list = ", ".join(f"'{t}'" for t in _FINANCE_TAGS)
        op.execute(sa.text(f"UPDATE {schema}.ui_fields SET section = 'finance' WHERE tag IN ({finance_list})"))

    # Add supports_subprojects to projects table
    op.add_column("projects", sa.Column("supports_subprojects", sa.Boolean(), nullable=False, server_default=sa.false()), schema="schema_core")
    op.alter_column("projects", "supports_subprojects", server_default=None, schema="schema_core")

    sp_keys = ", ".join(f"'{k}'" for k in _SUPPORTS_SUBPROJECTS)
    op.execute(sa.text(f"UPDATE schema_core.projects SET supports_subprojects = true WHERE key IN ({sp_keys})"))


def downgrade() -> None:
    for schema in _SCHEMAS:
        op.drop_column("ui_fields", "form_view", schema=schema)
        op.drop_column("ui_fields", "bulk_view", schema=schema)
        op.drop_column("ui_fields", "section", schema=schema)

    op.drop_column("projects", "supports_subprojects", schema="schema_core")
