"""drop_mirror_po_invoice_columns: remove po_number and invoice_number from all project site tables

These were mirror columns kept in sync with schema_acc.pos / schema_acc.invoices.
They are now derived at read time directly from the billing source of truth via
get_site_projection and list_sites, eliminating the sync burden.

Revision ID: 20260331_0045
Revises: 20260330_0044
Create Date: 2026-03-31
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260331_0045"
down_revision = "20260330_0044"
branch_labels = None
depends_on = None

_SCHEMAS = ("schema_mi", "schema_md", "schema_ma", "schema_mc", "schema_bb")


def upgrade() -> None:
    for schema in _SCHEMAS:
        op.drop_column("sites", "po_number", schema=schema)
        op.drop_column("sites", "invoice_number", schema=schema)


def downgrade() -> None:
    for schema in _SCHEMAS:
        op.add_column("sites", sa.Column("po_number", sa.String(128), nullable=True), schema=schema)
        op.add_column("sites", sa.Column("invoice_number", sa.String(128), nullable=True), schema=schema)
