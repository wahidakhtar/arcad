from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db

router = APIRouter(prefix="/admin/schema", tags=["admin-schema"])


def _serialize(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (bytes, memoryview)):
        return "<binary>"
    return v


@router.get("/tables", dependencies=[Depends(permission_required("admin", "read"))])
def list_tables(db: Session = Depends(get_db)) -> list[dict]:
    schema_rows = db.execute(
        text("""
            SELECT DISTINCT table_schema
            FROM information_schema.tables
            WHERE table_schema LIKE 'schema\\_%%' ESCAPE '\\'
              AND table_type = 'BASE TABLE'
            ORDER BY table_schema
        """)
    ).fetchall()

    result = []
    for (schema_name,) in schema_rows:
        col_rows = db.execute(
            text("""
                SELECT table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = :schema
                ORDER BY table_name, ordinal_position
            """),
            {"schema": schema_name},
        ).fetchall()

        tables_dict: dict[str, list[dict]] = {}
        for tname, cname, dtype, nullable, default in col_rows:
            tables_dict.setdefault(tname, []).append(
                {"name": cname, "type": dtype, "nullable": nullable == "YES", "default": default}
            )

        tables = []
        for tname in sorted(tables_dict):
            try:
                row_count = db.execute(
                    text(f'SELECT COUNT(*) FROM "{schema_name}"."{tname}"')
                ).scalar_one()
            except Exception:
                db.rollback()
                row_count = -1
            tables.append({"name": tname, "columns": tables_dict[tname], "row_count": row_count})

        result.append({"schema": schema_name, "tables": tables})

    return result


@router.get("/table-data", dependencies=[Depends(permission_required("admin", "read"))])
def get_table_data(
    schema: str = Query(...),
    table: str = Query(...),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    exists = db.execute(
        text("""
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = :schema AND table_name = :table AND table_type = 'BASE TABLE'
        """),
        {"schema": schema, "table": table},
    ).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail=f"Table {schema}.{table} not found")

    col_rows = db.execute(
        text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = :table
            ORDER BY ordinal_position
        """),
        {"schema": schema, "table": table},
    ).fetchall()
    columns = [r[0] for r in col_rows]

    total = db.execute(
        text(f'SELECT COUNT(*) FROM "{schema}"."{table}"')
    ).scalar_one()

    rows_raw = db.execute(
        text(f'SELECT * FROM "{schema}"."{table}" LIMIT :lim OFFSET :off'),
        {"lim": limit, "off": offset},
    ).fetchall()

    rows = [[_serialize(v) for v in row] for row in rows_raw]

    return {
        "schema": schema,
        "table": table,
        "total": total,
        "limit": limit,
        "offset": offset,
        "columns": columns,
        "rows": rows,
    }
