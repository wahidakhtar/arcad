from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260331_0049"
down_revision = "20260331_0048"
branch_labels = None
depends_on = None


PROJECT_SCHEMAS = ("schema_md", "schema_ma", "schema_mc")


def upgrade() -> None:
    for schema_name in PROJECT_SCHEMAS:
        op.execute(
            sa.text(
                f"""
                UPDATE {schema_name}.subprojects
                SET batch_date = date_trunc('month', batch_date)::date
                WHERE bucket = false AND batch_date IS NOT NULL
                """
            )
        )
        op.create_index(
            f"uq_{schema_name}_subprojects_batch_month",
            "subprojects",
            ["batch_date"],
            unique=True,
            schema=schema_name,
            postgresql_where=sa.text("bucket = false AND batch_date IS NOT NULL"),
        )


def downgrade() -> None:
    for schema_name in PROJECT_SCHEMAS:
        op.drop_index(
            f"uq_{schema_name}_subprojects_batch_month",
            table_name="subprojects",
            schema=schema_name,
        )
