from __future__ import annotations

from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET

from alembic import op
import sqlalchemy as sa

revision = "20260318_0002"
down_revision = "20260318_0001"
branch_labels = None
depends_on = None

PROJECT_SHEETS = {
    "mi": "schema_mi",
    "md": "schema_md",
    "ma": "schema_ma",
    "mc": "schema_mc",
    "bb": "schema_bb",
}

LABEL_TO_KEY = {
    "Receiving Date": "receiving_date",
    "Circuit ID": "ckt_id",
    "Customer": "customer",
    "Address": "address",
    "City": "city",
    "State": "state_id",
    "LC": "lc",
    "Height (mtr)": "height",
    "Permission Date": "permission_date",
    "EDD": "edd",
    "Status": "status",
    "Follow-up Date": "followup_date",
    "Completion Date": "completion_date",
    "WCC": "wcc_status",
    "WCC Status": "wcc_status",
    "Visit Date": "visit_date",
    "Outcome": "outcome",
    "Dismantle Date": "dismantle_date",
    "Tx Copy / WCC": "doc_status",
    "Painting": "mpaint",
    "Nut-Bolt Replacement": "mnbr",
    "Lightning Arrestor": "arr",
    "Lightning Arrester": "arr",
    "Earthpit": "ep",
    "Earthing Cable (mtr)": "ec",
    "Audit Date": "audit_date",
    "FSR Status": "fsr_status",
    "Report Status": "report_status",
    "CM Date": "cm_date",
    "Budget": "budget",
    "Cost": "cost",
    "Paid": "paid",
    "Balance": "balance",
    "PO Number": "po_number",
    "PO Status": "po_status",
    "Invoice Number": "invoice_number",
    "Invoice Status": "invoice_status",
    "Last Recharge Date": "last_recharge_date",
    "Next Recharge Date": "next_recharge_date",
    "Active PO Number": "active_po_number",
    "Active Invoice Number": "active_invoice_number",
    "Active Invoice Status": "active_invoice_status",
    "Next Invoice Date": "next_invoice_date",
}

FIELD_TYPE_MAP = {
    "receiving_date": "date",
    "ckt_id": "text",
    "customer": "text",
    "address": "text",
    "city": "text",
    "state_id": "dropdown",
    "lc": "text",
    "height": "number",
    "permission_date": "date",
    "edd": "date",
    "status": "badge",
    "followup_date": "date",
    "completion_date": "date",
    "wcc_status": "badge",
    "visit_date": "date",
    "outcome": "text",
    "dismantle_date": "date",
    "doc_status": "badge",
    "mpaint": "bool",
    "mnbr": "bool",
    "arr": "bool",
    "ep": "bool",
    "ec": "number",
    "audit_date": "date",
    "fsr_status": "badge",
    "report_status": "badge",
    "cm_date": "date",
    "budget": "number",
    "cost": "number",
    "paid": "number",
    "balance": "number",
    "po_number": "text",
    "po_status": "badge",
    "invoice_number": "text",
    "invoice_status": "badge",
    "last_recharge_date": "date",
    "next_recharge_date": "date",
    "active_po_number": "text",
    "active_invoice_number": "text",
    "active_invoice_status": "badge",
    "next_invoice_date": "date",
}

TYPE_NORMALIZATION = {
    "date": "date",
    "text": "text",
    "badge": "badge",
    "int": "number",
    "int/text": "number",
    "inr": "number",
}


def _load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.iterfind(".//a:t", ns)) for item in root.findall("a:si", ns)]


def _sheet_targets(archive: zipfile.ZipFile) -> dict[str, str]:
    ns = {
        "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    }
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_map = {rel.attrib["Id"]: "xl/" + rel.attrib["Target"] for rel in rels}
    return {
        sheet.attrib["name"]: rel_map[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
        for sheet in workbook.find("a:sheets", ns)
    }


def _column_letters(cell_ref: str) -> str:
    return "".join(char for char in cell_ref if char.isalpha())


def _column_index(column_name: str) -> int:
    index = 0
    for char in column_name:
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index


def _column_name(index: int) -> str:
    letters = []
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letters.append(chr(ord("A") + remainder))
    return "".join(reversed(letters))


def _sheet_rows(archive: zipfile.ZipFile, target: str, shared_strings: list[str]) -> dict[int, dict[str, str]]:
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    root = ET.fromstring(archive.read(target))
    rows: dict[int, dict[str, str]] = {}
    for row in root.findall(".//a:sheetData/a:row", ns):
        row_idx = int(row.attrib["r"])
        row_data: dict[str, str] = {}
        for cell in row.findall("a:c", ns):
            cell_ref = cell.attrib.get("r", "")
            value_node = cell.find("a:v", ns)
            if value_node is None:
                continue
            value = value_node.text or ""
            if cell.attrib.get("t") == "s":
                value = shared_strings[int(value)]
            row_data[_column_letters(cell_ref)] = value.strip()
        if row_data:
            rows[row_idx] = row_data
    return rows


def _extract_ui_rows(rows: dict[int, dict[str, str]]) -> list[dict[str, object]]:
    ui_anchor_col = None
    for cell_map in rows.values():
        for column, value in cell_map.items():
            if value == "ui_fields":
                ui_anchor_col = column
                break
        if ui_anchor_col:
            break
    if ui_anchor_col is None:
        raise RuntimeError("ui_fields anchor not found in workbook sheet")

    anchor_index = _column_index(ui_anchor_col)
    columns = [_column_name(anchor_index + offset) for offset in range(4)]
    label_col, _, list_view_col, type_col = columns
    items: list[dict[str, object]] = []

    for row_idx in sorted(rows):
        if row_idx <= 2:
            continue
        label = rows[row_idx].get(label_col, "").strip()
        if not label:
            continue
        key = LABEL_TO_KEY.get(label)
        if key is None:
            continue
        raw_type = rows[row_idx].get(type_col, "").strip().lower()
        items.append(
            {
                "label": label,
                "tag": key,
                "list_view": rows[row_idx].get(list_view_col, "").strip().lower() == "t",
                "type": FIELD_TYPE_MAP.get(key, TYPE_NORMALIZATION.get(raw_type, "text")),
            }
        )
    return items


def _workbook_ui_seed() -> dict[str, list[dict[str, object]]]:
    workbook_path = Path(__file__).resolve().parents[3] / "docs" / "DB_Library and UI_design.xlsx"
    with zipfile.ZipFile(workbook_path) as archive:
        shared_strings = _load_shared_strings(archive)
        targets = _sheet_targets(archive)
        return {
            project_key: _extract_ui_rows(_sheet_rows(archive, targets[sheet_name], shared_strings))
            for project_key, sheet_name in PROJECT_SHEETS.items()
        }


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    seed_data = _workbook_ui_seed()

    for project_key, schema_name in PROJECT_SHEETS.items():
        columns = {column["name"] for column in inspector.get_columns("ui_fields", schema=schema_name)}
        if "type" not in columns:
            op.add_column("ui_fields", sa.Column("type", sa.String(length=64), nullable=True), schema=schema_name)

        bind.execute(sa.text(f"DELETE FROM {schema_name}.ui_fields"))
        for idx, row in enumerate(seed_data[project_key], start=1):
            bind.execute(
                sa.text(
                    f"""
                    INSERT INTO {schema_name}.ui_fields (id, label, tag, list_view, type)
                    VALUES (:id, :label, :tag, :list_view, :type)
                    """
                ),
                {
                    "id": idx,
                    "label": row["label"],
                    "tag": row["tag"],
                    "list_view": row["list_view"],
                    "type": row["type"],
                },
            )

        if "type" not in columns:
            bind.execute(sa.text(f"ALTER TABLE {schema_name}.ui_fields ALTER COLUMN type SET NOT NULL"))

        bind.execute(
            sa.text(
                f"""
                CREATE OR REPLACE VIEW {schema_name}.ui AS
                SELECT id, label, tag, list_view, type
                FROM {schema_name}.ui_fields
                ORDER BY id
                """
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    for schema_name in PROJECT_SHEETS.values():
        bind.execute(sa.text(f"DROP VIEW IF EXISTS {schema_name}.ui"))
        bind.execute(sa.text(f"DELETE FROM {schema_name}.ui_fields"))
