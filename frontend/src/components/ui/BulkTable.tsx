import { useState } from "react"

import FieldRenderer, { type FieldDefinition } from "./FieldRenderer"

export default function BulkTable({
  columns,
  onSubmit,
}: {
  columns: FieldDefinition[]
  states?: Array<{ id: number; label: string }>
  onSubmit: (payload: { batchDate: string; rows: Array<Record<string, string | boolean>> }) => Promise<void>
}) {
  const [batchDate, setBatchDate] = useState("")
  const [rows, setRows] = useState<Array<Record<string, string | boolean>>>(
    Array.from({ length: 8 }, () => Object.fromEntries(columns.map((column) => [column.key, ""]))),
  )
  const [focus, setFocus] = useState<{ rowIndex: number; columnIndex: number } | null>(null)

  function updateCell(rowIndex: number, key: string, value: string | boolean) {
    setRows((current) => current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)))
  }

  return (
    <div className="space-y-5 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/70">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Receiving Date</span>
        <input
          type="text"
          value={batchDate}
          onChange={(event) => setBatchDate(event.target.value)}
          placeholder="DD/MM/YYYY"
          className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
        />
      </label>
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Bulk Entry Table</span>
        <div
          className="overflow-auto rounded-2xl border border-jscolors-crimson/15 bg-white"
          onPaste={(event) => {
            if (!focus) return
            event.preventDefault()
            const clipboard = event.clipboardData.getData("text")
            const pastedRows = clipboard.split("\n").map((line) => line.replace(/\r/g, "")).filter(Boolean)
            setRows((current) => {
              const next = [...current]
              pastedRows.forEach((line, rowOffset) => {
                const values = line.split("\t")
                const targetRow = focus.rowIndex + rowOffset
                if (!next[targetRow]) {
                  next[targetRow] = Object.fromEntries(columns.map((column) => [column.key, ""]))
                }
                values.forEach((value, columnOffset) => {
                  const targetColumn = columns[focus.columnIndex + columnOffset]
                  if (!targetColumn) return
                  next[targetRow] = { ...next[targetRow], [targetColumn.key]: value }
                })
              })
              return next
            })
          }}
        >
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-jscolors-crimson/[0.05]">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="border-b border-r border-jscolors-crimson/10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-jscolors-text/45">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, columnIndex) => (
                    <td key={column.key} className="border-r border-t border-jscolors-crimson/10 p-1">
                      <FieldRenderer
                        mode="input"
                        field={{
                          ...column,
                          type: "text",
                        }}
                        value={String(row[column.key] ?? "")}
                        onFocus={() => setFocus({ rowIndex, columnIndex })}
                        onChange={(value) => updateCell(rowIndex, column.key, String(value))}
                        className="w-full rounded-lg px-2 py-2 outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button type="button" className="premium-button" onClick={() => void onSubmit({ batchDate, rows: rows.filter((row) => Object.values(row).some((value) => value !== "" && value !== false)) })}>
        Create Subproject
      </button>
    </div>
  )
}
