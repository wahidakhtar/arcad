from __future__ import annotations

from datetime import date

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert

revision = "20260318_0001"
down_revision = None
branch_labels = None
depends_on = None


def _seed_projects() -> list[dict[str, object]]:
    return [
        {"id": 1, "key": "mi", "label": "Mast Installation", "active": True, "recurring": True},
        {"id": 2, "key": "md", "label": "Mast Dismantle", "active": True, "recurring": True},
        {"id": 3, "key": "ma", "label": "Mast Audit", "active": True, "recurring": True},
        {"id": 4, "key": "mc", "label": "Mast CM", "active": True, "recurring": True},
        {"id": 5, "key": "bb", "label": "Broadband", "active": True, "recurring": True},
        {"id": 6, "key": "hsd", "label": "HSD Tank", "active": True, "recurring": False},
        {"id": 7, "key": "rbi", "label": "RBI CCTV", "active": False, "recurring": False},
    ]


def _seed_badges() -> list[dict[str, object]]:
    rows = [
        (1, "department", "mgmt", "Management", None),
        (2, "department", "acc", "Accounts", None),
        (3, "department", "ops", "Operations", None),
        (4, "department", "hr", "HR", None),
        (5, "department", "fo", "FO", None),
        (6, "level", "l1", "Level 1", None),
        (7, "level", "l2", "Level 2", None),
        (8, "level", "l3", "Level 3", None),
        (9, "status", "wip", "WIP", "#0AACE8"),
        (10, "status", "p_wait", "Permission Awaited", "#93DCF9"),
        (11, "status", "p_iss", "Permission Issue", "#F1CA00"),
        (12, "status", "a_wait", "Approval Awaited", "#FEFE01"),
        (13, "status", "hold", "Hold", "#FEFE01"),
        (14, "status", "down", "Down", "#FD0000"),
        (15, "status", "live", "Live", "#92D050"),
        (16, "status", "term", "Terminated", "#F3C214"),
        (17, "status", "rect", "Rectification", "#E3EDD2"),
        (18, "status", "cancel", "Cancelled", "#F2D0D3"),
        (19, "status", "comp", "Completed", "#92D050"),
        (20, "status", "stage", "Staged", "#7F7F7F"),
        (21, "doc_status", "pend", "Pending", "#F2D0D3"),
        (22, "doc_status", "rec", "Received", "#92D050"),
        (23, "doc_status", "gen", "Generated", "#93DCF9"),
        (24, "doc_status", "rsd", "Raised", "#0AACE8"),
        (25, "doc_status", "set", "Settled", "#92D050"),
        (26, "doc_status", "sign", "Signed", "#92D050"),
        (27, "doc_status", "shr", "Shared", "#92D050"),
        (28, "doc_status", "rej", "Rejected", "#FD0000"),
        (29, "doc_status", "exp", "Expired", "#F2D0D3"),
        (30, "doc_status", "act", "Active", "#92D050"),
        (31, "transaction", "fe_pay", "FE Payment", None),
        (32, "transaction", "b_sur", "Billable Surcharge", None),
        (33, "transaction", "e_sur", "Extra Surcharge", None),
        (34, "transaction", "ref", "Refund", None),
        (35, "transaction", "rec", "Recharge", None),
        (36, "transaction", "sal", "Salary", None),
        (37, "transaction", "oth", "Other", None),
        (38, "status", "req", "Requested", None),
        (39, "status", "exct", "Executed", None),
    ]
    return [{"id": row[0], "type": row[1], "key": row[2], "label": row[3], "color": row[4]} for row in rows]


def _seed_states() -> list[dict[str, object]]:
    labels = [
        "Andaman and Nicobar Islands",
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chandigarh",
        "Chhattisgarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jammu and Kashmir",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Ladakh",
        "Lakshadweep",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Puducherry",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
    ]
    return [{"id": idx, "key": f"state_{idx}", "label": label} for idx, label in enumerate(labels, start=1)]


def _seed_roles() -> list[dict[str, object]]:
    rows = [
        (1, "mgmtl3", "Management L3", "mgmt", "l3", True),
        (2, "mgmtl2", "Management L2", "mgmt", "l2", True),
        (3, "mgmtl1", "Management L1", "mgmt", "l1", True),
        (4, "accl2", "Accounts L2", "acc", "l2", True),
        (5, "accl1", "Accounts L1", "acc", "l1", True),
        (6, "opsl3", "Operations L3", "ops", "l3", False),
        (7, "opsl2", "Operations L2", "ops", "l2", False),
        (8, "opsl1", "Operations L1", "ops", "l1", False),
        (9, "hrl1", "HR L1", "hr", "l1", True),
        (10, "fol1", "FO L1", "fo", "l1", False),
    ]
    return [
        {
            "id": row[0],
            "key": row[1],
            "label": row[2],
            "dept_key": row[3],
            "level_key": row[4],
            "global_scope": row[5],
        }
        for row in rows
    ]


def _seed_permission_rules() -> list[dict[str, object]]:
    rows = [
        (1, 1, "project", True, True), (2, 1, "user", True, True), (3, 1, "subproject", True, True),
        (4, 1, "role", True, True), (5, 1, "site", True, True), (6, 1, "field", True, True),
        (7, 1, "transaction", True, True), (8, 1, "billing", True, True), (9, 1, "rate", True, True), (10, 1, "update", True, True),
        (11, 2, "project", True, True), (12, 2, "user", True, False), (13, 2, "subproject", True, True),
        (14, 2, "role", True, True), (15, 2, "site", True, False), (16, 2, "field", True, False),
        (17, 2, "transaction", True, False), (18, 2, "billing", True, False), (19, 2, "rate", True, False), (20, 2, "update", True, False),
        (21, 3, "project", True, False), (22, 3, "user", True, False), (23, 3, "subproject", True, False),
        (24, 3, "role", True, False), (25, 3, "site", True, False), (26, 3, "field", True, False),
        (27, 3, "transaction", True, False), (28, 3, "billing", True, False), (29, 3, "rate", True, False), (30, 3, "update", True, False),
        (31, 4, "project", True, False), (32, 4, "subproject", True, False), (33, 4, "site", True, False),
        (34, 4, "field", True, False), (35, 4, "transaction", True, True), (36, 4, "billing", True, True), (37, 4, "rate", True, True), (38, 4, "update", True, True),
        (39, 5, "project", True, False), (40, 5, "subproject", True, False), (41, 5, "site", True, False),
        (42, 5, "field", True, False), (43, 5, "transaction", True, True), (44, 5, "billing", True, True), (45, 5, "rate", True, False), (46, 5, "update", True, True),
        (47, 6, "subproject", True, True), (48, 6, "site", True, True), (49, 6, "field", True, True), (50, 6, "transaction", True, True), (51, 6, "update", True, True),
        (52, 7, "subproject", True, False), (53, 7, "site", True, True), (54, 7, "field", True, True), (55, 7, "transaction", True, False), (56, 7, "update", True, True),
        (57, 8, "site", True, True), (58, 8, "field", True, True), (59, 8, "update", True, False),
        (60, 9, "user", True, True),
        (61, 10, "field", True, False), (62, 10, "transaction", True, True),
    ]
    return [{"id": row[0], "role_id": row[1], "tag": row[2], "read": row[3], "write": row[4]} for row in rows]


def _seed_job_buckets() -> list[dict[str, object]]:
    return [
        {"id": 1, "key": "bmi", "label": "MI"},
        {"id": 2, "key": "bma", "label": "MA"},
        {"id": 3, "key": "bmc", "label": "MC"},
        {"id": 4, "key": "bmdv", "label": "MD Visit"},
        {"id": 5, "key": "bmd", "label": "MD"},
    ]


def _seed_jobs() -> list[dict[str, object]]:
    rows = [
        (1, 1, "mi", "jmi", "Mast Installation"),
        (2, 2, "ma", "jma", "Mast Audit"),
        (3, 3, "nbr", "jnbr", "Nut-Bolt Replacement"),
        (4, 3, "ep", "jep", "Earthpit"),
        (5, 3, "ec", "jec", "Earthing Cable"),
        (6, 3, "mpaint", "jpaint", "Mast Painting"),
        (7, 4, "mdv", "jmdv", "Mast Dismantle Visit"),
        (8, 5, "md", "jmd", "Mast Dismantle"),
        (9, 3, "arr", "jarr", "Lightning Arrester"),
    ]
    return [
        {"id": row[0], "job_bucket_id": row[1], "bucket_key": row[2], "job_key": row[3], "label": row[4]}
        for row in rows
    ]


def _seed_transition_types() -> list[dict[str, object]]:
    return [
        {"id": 1, "key": "wcc", "label": "WCC"},
        {"id": 2, "key": "fsr", "label": "FSR"},
        {"id": 3, "key": "report", "label": "Report"},
        {"id": 4, "key": "invoice", "label": "Invoice"},
        {"id": 5, "key": "site", "label": "Site"},
        {"id": 6, "key": "transaction", "label": "Transaction"},
    ]


def _seed_rate_card() -> list[dict[str, object]]:
    rows = [
        (1, 1, "mi", date(2020, 1, 1), 2500),
        (2, 1, "mi", date(2026, 1, 1), 2600),
        (3, 6, "mpaint", date(2020, 1, 1), 350),
        (4, 2, "ma", date(2020, 1, 1), 1000),
        (5, 3, "nbr", date(2020, 1, 1), 1500),
        (6, 4, "ep", date(2020, 1, 1), 2000),
        (7, 5, "ec", date(2020, 1, 1), 32),
        (8, 7, "mdv", date(2020, 1, 1), 500),
        (9, 8, "md", date(2020, 1, 1), 350),
        (10, 9, "arr", date(2020, 1, 1), 1200),
    ]
    return [
        {"id": row[0], "job_id": row[1], "job_key": row[2], "date": row[3], "cost": row[4]}
        for row in rows
    ]


def _seed_project_badge_transitions() -> dict[str, list[dict[str, int]]]:
    return {
        "schema_mi": [
            {"id": 1, "type_id": 5, "from_id": 9, "to_id": 13},
            {"id": 2, "type_id": 5, "from_id": 9, "to_id": 18},
            {"id": 3, "type_id": 5, "from_id": 13, "to_id": 10},
            {"id": 4, "type_id": 5, "from_id": 13, "to_id": 18},
            {"id": 5, "type_id": 1, "from_id": 21, "to_id": 26},
        ],
        "schema_md": [
            {"id": 1, "type_id": 5, "from_id": 9, "to_id": 13},
            {"id": 2, "type_id": 5, "from_id": 9, "to_id": 18},
            {"id": 3, "type_id": 5, "from_id": 13, "to_id": 10},
            {"id": 4, "type_id": 5, "from_id": 18, "to_id": 10},
            {"id": 5, "type_id": 1, "from_id": 21, "to_id": 26},
        ],
        "schema_ma": [
            {"id": 1, "type_id": 5, "from_id": 9, "to_id": 13},
            {"id": 2, "type_id": 5, "from_id": 9, "to_id": 18},
            {"id": 3, "type_id": 5, "from_id": 13, "to_id": 10},
            {"id": 4, "type_id": 5, "from_id": 10, "to_id": 11},
            {"id": 5, "type_id": 5, "from_id": 11, "to_id": 10},
            {"id": 6, "type_id": 2, "from_id": 21, "to_id": 26},
            {"id": 7, "type_id": 3, "from_id": 21, "to_id": 23},
            {"id": 8, "type_id": 3, "from_id": 23, "to_id": 27},
        ],
        "schema_mc": [
            {"id": 1, "type_id": 5, "from_id": 9, "to_id": 13},
            {"id": 2, "type_id": 5, "from_id": 9, "to_id": 18},
            {"id": 3, "type_id": 5, "from_id": 13, "to_id": 10},
            {"id": 4, "type_id": 5, "from_id": 12, "to_id": 10},
            {"id": 5, "type_id": 5, "from_id": 10, "to_id": 11},
            {"id": 6, "type_id": 5, "from_id": 11, "to_id": 10},
            {"id": 7, "type_id": 1, "from_id": 21, "to_id": 26},
            {"id": 8, "type_id": 3, "from_id": 21, "to_id": 23},
            {"id": 9, "type_id": 3, "from_id": 23, "to_id": 27},
        ],
    }


def _create_project_tables(schema_name: str, include_state: bool, extra_columns: list[sa.Column]) -> None:
    op.create_table(
        "subprojects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_date", sa.Date(), nullable=True),
        sa.Column("bucket", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema=schema_name,
    )

    site_columns = [
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subproject_id", sa.Integer(), sa.ForeignKey(f"{schema_name}.subprojects.id"), nullable=False),
        sa.Column("receiving_date", sa.Date(), nullable=False),
        sa.Column("ckt_id", sa.String(length=64), nullable=False),
        sa.Column("customer", sa.String(length=255), nullable=True),
        sa.Column("height", sa.Numeric(10, 2), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("lc", sa.String(length=255), nullable=True),
        sa.Column("permission_date", sa.Date(), nullable=True),
        sa.Column("status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("followup_date", sa.Date(), nullable=True),
    ]
    if include_state:
        site_columns.append(sa.Column("state_id", sa.Integer(), sa.ForeignKey("schema_core.indian_states.id"), nullable=True))
    else:
        site_columns.append(sa.Column("city", sa.String(length=255), nullable=True))
    site_columns.extend(extra_columns)
    site_columns.extend(
        [
            sa.Column("po_number", sa.String(length=128), nullable=True),
            sa.Column("invoice_number", sa.String(length=128), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        ]
    )
    op.create_table("sites", *site_columns, schema=schema_name)

    op.create_table(
        "ui_fields",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("tag", sa.String(length=64), nullable=False),
        sa.Column("list_view", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("type", sa.String(length=64), nullable=False),
        schema=schema_name,
    )
    op.create_table(
        "badge_transitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type_id", sa.Integer(), sa.ForeignKey("schema_core.transition_types.id"), nullable=False),
        sa.Column("from_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("to_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        schema=schema_name,
    )


def _insert_rows_on_conflict_do_nothing(table, rows: list[dict[str, object]], conflict_columns: list[str]) -> None:
    if not rows:
        return
    statement = pg_insert(table).values(rows)
    statement = statement.on_conflict_do_nothing(index_elements=conflict_columns)
    op.get_bind().execute(statement)


def upgrade() -> None:
    for schema_name in [
        "schema_core",
        "schema_auth",
        "schema_hr",
        "schema_acc",
        "schema_ops",
        "schema_updates",
        "schema_mi",
        "schema_md",
        "schema_ma",
        "schema_mc",
        "schema_bb",
    ]:
        op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=32), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("recurring", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema="schema_core",
    )
    op.create_table(
        "badges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("color", sa.String(length=16), nullable=True),
        schema="schema_core",
    )
    op.create_table(
        "permission_tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("tag", sa.String(length=64), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("write", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema="schema_core",
    )
    op.create_table(
        "job_buckets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=32), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        schema="schema_core",
    )
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_bucket_id", sa.Integer(), sa.ForeignKey("schema_core.job_buckets.id"), nullable=False),
        sa.Column("bucket_key", sa.String(length=32), nullable=False),
        sa.Column("job_key", sa.String(length=32), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        schema="schema_core",
    )
    op.create_table(
        "indian_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        schema="schema_core",
    )
    op.create_table(
        "transition_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        schema="schema_core",
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=64), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("dept_key", sa.String(length=32), nullable=False),
        sa.Column("level_key", sa.String(length=32), nullable=False),
        sa.Column("global_scope", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema="schema_hr",
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False, unique=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("hash", sa.String(length=255), nullable=False),
        sa.Column("aadhaar", sa.String(length=32), nullable=True),
        sa.Column("upi", sa.String(length=255), nullable=True),
        sa.Column("ctc", sa.String(length=255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema="schema_hr",
    )
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("schema_hr.roles.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=True),
        schema="schema_hr",
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("device_label", sa.String(length=255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema="schema_auth",
    )
    op.create_index("ix_sessions_token_hash", "sessions", ["token_hash"], unique=True, schema="schema_auth")
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("schema_auth.sessions.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema="schema_auth",
    )
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True, schema="schema_auth")

    op.create_table(
        "rate_card",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("schema_core.jobs.id"), nullable=False),
        sa.Column("job_key", sa.String(length=32), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        schema="schema_acc",
    )
    op.create_table(
        "pos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=True),
        sa.Column("entity_id", sa.String(length=128), nullable=True),
        sa.Column("po_date", sa.Date(), nullable=True),
        sa.Column("po_no", sa.String(length=128), nullable=True),
        sa.Column("period_from", sa.Date(), nullable=True),
        sa.Column("period_to", sa.Date(), nullable=True),
        sa.Column("po_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema="schema_acc",
    )
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("po_id", sa.Integer(), sa.ForeignKey("schema_acc.pos.id"), nullable=False),
        sa.Column("invoice_no", sa.String(length=128), nullable=True),
        sa.Column("submission_date", sa.Date(), nullable=True),
        sa.Column("settlement_date", sa.Date(), nullable=True),
        sa.Column("invoice_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema="schema_acc",
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_date", sa.Date(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=True),
        sa.Column("type_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=True),
        sa.Column("bucket_key", sa.String(length=32), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("execution_date", sa.Date(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema="schema_acc",
    )
    op.create_index("ix_transactions_project_site", "transactions", ["project_id", "site_id"], schema="schema_acc")
    op.create_index("ix_transactions_status_id", "transactions", ["status_id"], schema="schema_acc")
    op.create_index("ix_transactions_recipient_id", "transactions", ["recipient_id"], schema="schema_acc")

    op.create_table(
        "fe_assignment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("bucket_id", sa.Integer(), sa.ForeignKey("schema_core.job_buckets.id"), nullable=False),
        sa.Column("fe_id", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("final_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema="schema_ops",
    )
    op.create_index("ix_fe_assignment_site_id", "fe_assignment", ["site_id"], schema="schema_ops")
    op.create_table(
        "punch_point",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        schema="schema_ops",
    )
    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_number", sa.String(length=128), nullable=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("ticket_date", sa.Date(), nullable=False),
        sa.Column("ticket_time", sa.Time(), nullable=True),
        sa.Column("pp_id", sa.Integer(), sa.ForeignKey("schema_ops.punch_point.id"), nullable=True),
        sa.Column("rfo", sa.String(length=255), nullable=True),
        sa.Column("closing_date", sa.Date(), nullable=True),
        sa.Column("closing_time", sa.Time(), nullable=True),
        schema="schema_ops",
    )
    op.create_index("ix_tickets_site_id", "tickets", ["site_id"], schema="schema_ops")

    op.create_table(
        "updates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("update", sa.Text(), nullable=False),
        sa.Column("followup_date", sa.Date(), nullable=True),
        schema="schema_updates",
    )
    op.create_table(
        "site_media",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("schema_core.projects.id"), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("schema_hr.users.id"), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("caption", sa.String(length=255), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=True),
        schema="schema_core",
    )

    _create_project_tables(
        "schema_mi",
        include_state=False,
        extra_columns=[
            sa.Column("edd", sa.Date(), nullable=True),
            sa.Column("completion_date", sa.Date(), nullable=True),
            sa.Column("wcc_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
        ],
    )
    _create_project_tables(
        "schema_md",
        include_state=True,
        extra_columns=[
            sa.Column("visit_date", sa.Date(), nullable=True),
            sa.Column("outcome", sa.String(length=128), nullable=True),
            sa.Column("dismantle_date", sa.Date(), nullable=True),
            sa.Column("scrap_value", sa.Numeric(12, 2), nullable=True),
            sa.Column("doc_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
        ],
    )
    _create_project_tables(
        "schema_ma",
        include_state=True,
        extra_columns=[
            sa.Column("mpaint", sa.Boolean(), nullable=True),
            sa.Column("mnbr", sa.Boolean(), nullable=True),
            sa.Column("arr", sa.Boolean(), nullable=True),
            sa.Column("ep", sa.Boolean(), nullable=True),
            sa.Column("ec", sa.Numeric(12, 2), nullable=True),
            sa.Column("audit_date", sa.Date(), nullable=True),
            sa.Column("fsr_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
            sa.Column("report_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
            sa.Column("transferred_to_mc", sa.Boolean(), nullable=False, server_default=sa.false()),
        ],
    )
    _create_project_tables(
        "schema_mc",
        include_state=True,
        extra_columns=[
            sa.Column("audit_date", sa.Date(), nullable=True),
            sa.Column("mpaint", sa.Boolean(), nullable=True),
            sa.Column("mnbr", sa.Boolean(), nullable=True),
            sa.Column("arr", sa.Boolean(), nullable=True),
            sa.Column("ep", sa.Boolean(), nullable=True),
            sa.Column("ec", sa.Numeric(12, 2), nullable=True),
            sa.Column("cm_date", sa.Date(), nullable=True),
            sa.Column("wcc_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
            sa.Column("report_status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=True),
        ],
    )

    op.create_table(
        "subprojects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_date", sa.Date(), nullable=True),
        sa.Column("bucket", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        schema="schema_bb",
    )
    op.create_table(
        "providers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        schema="schema_bb",
    )
    op.create_table(
        "sites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subproject_id", sa.Integer(), sa.ForeignKey("schema_bb.subprojects.id"), nullable=False),
        sa.Column("receiving_date", sa.Date(), nullable=False),
        sa.Column("ckt_id", sa.String(length=64), nullable=False),
        sa.Column("customer", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=255), nullable=True),
        sa.Column("lc", sa.String(length=255), nullable=True),
        sa.Column("status_id", sa.Integer(), sa.ForeignKey("schema_core.badges.id"), nullable=False),
        sa.Column("provider_id", sa.Integer(), sa.ForeignKey("schema_bb.providers.id"), nullable=True),
        sa.Column("username", sa.String(length=255), nullable=True),
        sa.Column("password", sa.String(length=255), nullable=True),
        sa.Column("po_number", sa.String(length=128), nullable=True),
        sa.Column("invoice_number", sa.String(length=128), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        schema="schema_bb",
    )
    op.create_table(
        "ui_fields",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("tag", sa.String(length=64), nullable=False),
        sa.Column("list_view", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("type", sa.String(length=64), nullable=False),
        schema="schema_bb",
    )
    op.create_table(
        "recharges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("schema_bb.sites.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("validity", sa.Integer(), nullable=False),
        sa.Column("uom", sa.String(length=32), nullable=False),
        schema="schema_bb",
    )
    op.create_table(
        "terminations",
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("schema_bb.sites.id"), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        schema="schema_bb",
    )

    project_table = sa.table(
        "projects",
        sa.column("id", sa.Integer()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        sa.column("active", sa.Boolean()),
        sa.column("recurring", sa.Boolean()),
        schema="schema_core",
    )
    badge_table = sa.table(
        "badges",
        sa.column("id", sa.Integer()),
        sa.column("type", sa.String()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        sa.column("color", sa.String()),
        schema="schema_core",
    )
    permission_table = sa.table(
        "permission_tags",
        sa.column("id", sa.Integer()),
        sa.column("role_id", sa.Integer()),
        sa.column("tag", sa.String()),
        sa.column("read", sa.Boolean()),
        sa.column("write", sa.Boolean()),
        schema="schema_core",
    )
    bucket_table = sa.table(
        "job_buckets",
        sa.column("id", sa.Integer()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        schema="schema_core",
    )
    jobs_table = sa.table(
        "jobs",
        sa.column("id", sa.Integer()),
        sa.column("job_bucket_id", sa.Integer()),
        sa.column("bucket_key", sa.String()),
        sa.column("job_key", sa.String()),
        sa.column("label", sa.String()),
        schema="schema_core",
    )
    state_table = sa.table(
        "indian_states",
        sa.column("id", sa.Integer()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        schema="schema_core",
    )
    transition_type_table = sa.table(
        "transition_types",
        sa.column("id", sa.Integer()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        schema="schema_core",
    )
    roles_table = sa.table(
        "roles",
        sa.column("id", sa.Integer()),
        sa.column("key", sa.String()),
        sa.column("label", sa.String()),
        sa.column("dept_key", sa.String()),
        sa.column("level_key", sa.String()),
        sa.column("global_scope", sa.Boolean()),
        schema="schema_hr",
    )
    rate_card_table = sa.table(
        "rate_card",
        sa.column("id", sa.Integer()),
        sa.column("job_id", sa.Integer()),
        sa.column("job_key", sa.String()),
        sa.column("date", sa.Date()),
        sa.column("cost", sa.Numeric()),
        schema="schema_acc",
    )

    _insert_rows_on_conflict_do_nothing(project_table, _seed_projects(), ["id"])
    _insert_rows_on_conflict_do_nothing(badge_table, _seed_badges(), ["key"])
    _insert_rows_on_conflict_do_nothing(state_table, _seed_states(), ["id"])
    _insert_rows_on_conflict_do_nothing(roles_table, _seed_roles(), ["id"])
    _insert_rows_on_conflict_do_nothing(permission_table, _seed_permission_rules(), ["id"])
    _insert_rows_on_conflict_do_nothing(bucket_table, _seed_job_buckets(), ["id"])
    _insert_rows_on_conflict_do_nothing(jobs_table, _seed_jobs(), ["id"])
    _insert_rows_on_conflict_do_nothing(transition_type_table, _seed_transition_types(), ["id"])
    _insert_rows_on_conflict_do_nothing(rate_card_table, _seed_rate_card(), ["id"])

    for schema_name, rows in _seed_project_badge_transitions().items():
        transitions_table = sa.table(
            "badge_transitions",
            sa.column("id", sa.Integer()),
            sa.column("type_id", sa.Integer()),
            sa.column("from_id", sa.Integer()),
            sa.column("to_id", sa.Integer()),
            schema=schema_name,
        )
        _insert_rows_on_conflict_do_nothing(transitions_table, rows, ["id"])


def downgrade() -> None:
    op.drop_table("terminations", schema="schema_bb")
    op.drop_table("recharges", schema="schema_bb")
    op.drop_table("providers", schema="schema_bb")
    op.drop_table("ui_fields", schema="schema_bb")
    op.drop_table("sites", schema="schema_bb")
    op.drop_table("subprojects", schema="schema_bb")

    for schema_name in ["schema_mc", "schema_ma", "schema_md", "schema_mi"]:
        op.drop_table("badge_transitions", schema=schema_name)
        op.drop_table("ui_fields", schema=schema_name)
        op.drop_table("sites", schema=schema_name)
        op.drop_table("subprojects", schema=schema_name)

    op.drop_table("site_media", schema="schema_core")
    op.drop_table("updates", schema="schema_updates")
    op.drop_index("ix_tickets_site_id", table_name="tickets", schema="schema_ops")
    op.drop_table("tickets", schema="schema_ops")
    op.drop_table("punch_point", schema="schema_ops")
    op.drop_index("ix_fe_assignment_site_id", table_name="fe_assignment", schema="schema_ops")
    op.drop_table("fe_assignment", schema="schema_ops")
    op.drop_index("ix_transactions_recipient_id", table_name="transactions", schema="schema_acc")
    op.drop_index("ix_transactions_status_id", table_name="transactions", schema="schema_acc")
    op.drop_index("ix_transactions_project_site", table_name="transactions", schema="schema_acc")
    op.drop_table("transactions", schema="schema_acc")
    op.drop_table("invoices", schema="schema_acc")
    op.drop_table("pos", schema="schema_acc")
    op.drop_table("rate_card", schema="schema_acc")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens", schema="schema_auth")
    op.drop_table("refresh_tokens", schema="schema_auth")
    op.drop_index("ix_sessions_token_hash", table_name="sessions", schema="schema_auth")
    op.drop_table("sessions", schema="schema_auth")
    op.drop_table("user_roles", schema="schema_hr")
    op.drop_table("users", schema="schema_hr")
    op.drop_table("roles", schema="schema_hr")
    op.drop_table("transition_types", schema="schema_core")
    op.drop_table("indian_states", schema="schema_core")
    op.drop_table("jobs", schema="schema_core")
    op.drop_table("job_buckets", schema="schema_core")
    op.drop_table("permission_tags", schema="schema_core")
    op.drop_table("badges", schema="schema_core")
    op.drop_table("projects", schema="schema_core")

    for schema_name in [
        "schema_bb",
        "schema_mc",
        "schema_ma",
        "schema_md",
        "schema_mi",
        "schema_updates",
        "schema_ops",
        "schema_acc",
        "schema_hr",
        "schema_auth",
        "schema_core",
    ]:
        op.execute(sa.text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
