export type ExportColumn = {
  key: string
  label: string
  type?: string
  align?: "left" | "right"
}

type BadgeLike = { label: string; color?: string | null }

function isBadge(value: unknown): value is BadgeLike {
  return (
    value !== null &&
    typeof value === "object" &&
    "label" in (value as object) &&
    typeof (value as BadgeLike).label === "string"
  )
}

/** Convert #RRGGBB or #RGB to ExcelJS ARGB (FFRRGGBB) */
function toArgb(hex: string): string {
  const h = hex.replace("#", "")
  if (h.length === 3) {
    return "FF" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (h.length === 6) {
    return "FF" + h
  }
  return "FF000000"
}

/** Decide whether to use white or dark text on a given background */
function contrastColor(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "FF000000" : "FFFFFFFF"
}

function cellDisplayValue(value: unknown): string | number | boolean | null {
  if (value == null) return null
  if (isBadge(value)) return value.label
  if (typeof value === "number" || typeof value === "boolean") return value
  return String(value)
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
): Promise<void> {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)

  // Set up columns with initial widths
  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.label.length + 4,
  }))

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF1A1A2E" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEF2" } }
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    }
    cell.alignment = { vertical: "middle" }
  })
  headerRow.height = 22

  // Add data rows
  rows.forEach((row) => {
    const rowValues: (string | number | boolean | null)[] = columns.map((col) =>
      cellDisplayValue(row[col.key]),
    )
    const excelRow = sheet.addRow(rowValues)
    excelRow.height = 18

    // Apply badge background colors
    columns.forEach((col, colIdx) => {
      const value = row[col.key]
      const cell = excelRow.getCell(colIdx + 1)
      cell.alignment = {
        vertical: "middle",
        horizontal: col.align === "right" ? "right" : "left",
      }

      if (isBadge(value) && value.color) {
        const bgArgb = toArgb(value.color)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } }
        cell.font = { color: { argb: contrastColor(value.color.replace("#", "").padEnd(6, "0")) }, bold: true }
      }
    })
  })

  // Auto-size column widths based on content
  sheet.columns.forEach((col, idx) => {
    const colDef = columns[idx]
    if (!colDef) return
    let maxLen = colDef.label.length
    rows.forEach((row) => {
      const val = row[colDef.key]
      const display = isBadge(val) ? val.label : String(val ?? "")
      maxLen = Math.max(maxLen, display.length)
    })
    col.width = Math.min(maxLen + 4, 52)
  })

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
