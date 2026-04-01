import { useEffect, useRef, useState } from "react"

import FieldRenderer, { type FieldDefinition } from "./FieldRenderer"

const TODAY = new Date().toISOString().slice(0, 10)

type CellError = {
  row_index: number
  field: string
  message: string
  value?: string
  suggestion?: string
}

type BulkFix = {
  field: string
  from_value: string
  to_value: string
  count: number
}

const INITIAL_ROW_COUNT = 8

export default function BulkTable({
  columns,
  onSubmit,
  onLoadingChange,
  submitRef,
}: {
  columns: FieldDefinition[]
  states?: Array<{ id: number; label: string }>
  onSubmit: (payload: { batchDate: string; rows: Array<Record<string, string | boolean>> }) => Promise<void>
  onLoadingChange?: (loading: boolean) => void
  submitRef?: React.MutableRefObject<(() => void) | null>
}) {
  const [batchDate, setBatchDate] = useState(TODAY)
  const [rows, setRows] = useState<Array<Record<string, string | boolean>>>(
    Array.from({ length: INITIAL_ROW_COUNT }, () => Object.fromEntries(columns.map((column) => [column.key, ""]))),
  )
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; columnIndex: number }>({ rowIndex: 0, columnIndex: 0 })
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnIndex: number } | null>(null)
  const [error, setError] = useState("")
  const [cellErrors, setCellErrors] = useState<CellError[]>([])
  const [bulkFixes, setBulkFixes] = useState<BulkFix[]>([])
  const [loading, setLoading] = useState(false)

  const batchDateRef = useRef(batchDate)
  const rowsRef = useRef(rows)
  useEffect(() => { batchDateRef.current = batchDate }, [batchDate])
  useEffect(() => { rowsRef.current = rows }, [rows])

  async function handleSubmit() {
    if (loading) return
    const filteredRows = rowsRef.current.filter((row) => Object.values(row).some((v) => v !== "" && v !== false))
    const payload = { batchDate: batchDateRef.current, rows: filteredRows }
    setError("")
    setCellErrors([])
    setBulkFixes([])
    setLoading(true)
    onLoadingChange?.(true)
    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (detail && typeof detail === "object") {
        const payloadDetail = detail as { message?: string; errors?: CellError[]; fixes?: BulkFix[] }
        setError(payloadDetail.message ?? "Please fix the highlighted cells and submit again.")
        setCellErrors(Array.isArray(payloadDetail.errors) ? payloadDetail.errors : [])
        setBulkFixes(Array.isArray(payloadDetail.fixes) ? payloadDetail.fixes : [])
      } else {
        setError(typeof detail === "string" ? detail : "Failed to submit")
      }
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  useEffect(() => {
    if (!submitRef) return
    submitRef.current = () => { void handleSubmit() }
    return () => {
      submitRef.current = null
    }
  })

  function updateCell(rowIndex: number, key: string, value: string | boolean) {
    setRows((current) => current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)))
    setCellErrors((current) => current.filter((item) => !(item.row_index === rowIndex && item.field === key)))
  }

  function ensureRow(nextRows: Array<Record<string, string | boolean>>, rowIndex: number) {
    while (!nextRows[rowIndex]) {
      nextRows.push(Object.fromEntries(columns.map((column) => [column.key, ""])))
    }
  }

  function applyFixToAll(fix: BulkFix) {
    setRows((current) =>
      current.map((row) => (
        String(row[fix.field] ?? "").trim() === fix.from_value
          ? { ...row, [fix.field]: fix.to_value }
          : row
      )),
    )
    setCellErrors((current) => current.filter((item) => !(item.field === fix.field && String(item.value ?? "").trim() === fix.from_value)))
    setBulkFixes((current) => current.filter((item) => !(item.field === fix.field && item.from_value === fix.from_value && item.to_value === fix.to_value)))
  }

  function stopEditing() {
    setEditingCell(null)
  }

  return (
    <div className="flex min-h-0 flex-col space-y-5 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/70">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Receiving Date</span>
        <input
          type="date"
          value={batchDate}
          onChange={(event) => setBatchDate(event.target.value)}
          className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
        />
      </label>
      <div className="flex min-h-0 flex-col">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Bulk Entry Table</span>
        {bulkFixes.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Suggested Fixes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {bulkFixes.map((fix) => (
                <button
                  key={`${fix.field}:${fix.from_value}:${fix.to_value}`}
                  type="button"
                  onClick={() => applyFixToAll(fix)}
                  className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                >
                  {`Replace ${fix.from_value} with ${fix.to_value} (${fix.count})`}
                </button>
              ))}
            </div>
          </div>
        )}
        <div
          className="min-h-0 max-h-[52vh] overflow-auto rounded-2xl border border-jscolors-crimson/15 bg-white"
          onPaste={(event) => {
            event.preventDefault()
            const clipboard = event.clipboardData.getData("text")
            const pastedRows = clipboard.split("\n").map((line) => line.replace(/\r/g, "")).filter(Boolean)
            setRows((current) => {
              const next = [...current]
              pastedRows.forEach((line, rowOffset) => {
                const values = line.split("\t")
                const targetRow = activeCell.rowIndex + rowOffset
                ensureRow(next, targetRow)
                values.forEach((value, columnOffset) => {
                  const targetColumn = columns[activeCell.columnIndex + columnOffset]
                  if (!targetColumn) return
                  next[targetRow] = { ...next[targetRow], [targetColumn.key]: value }
                })
              })
              return next
            })
            setEditingCell(null)
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
                  {columns.map((column, columnIndex) => {
                    const cellError = cellErrors.find((item) => item.row_index === rowIndex && item.field === column.key)
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell.columnIndex === columnIndex
                    const cellValue = String(row[column.key] ?? "")
                    return (
                      <td key={column.key} className="border-r border-t border-jscolors-crimson/10 p-1 align-top">
                        {isEditing ? (
                          <FieldRenderer
                            mode="input"
                            field={{
                              ...column,
                              type: "text",
                            }}
                            value={cellValue}
                            autoFocus
                            onFocus={() => setActiveCell({ rowIndex, columnIndex })}
                            onBlur={stopEditing}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") {
                                event.preventDefault()
                                stopEditing()
                              }
                            }}
                            onChange={(value) => updateCell(rowIndex, column.key, String(value))}
                            className={`w-full rounded-lg px-2 py-2 outline-none ${cellError ? "border border-red-300 text-red-700" : ""}`}
                          />
                        ) : (
                          <button
                            type="button"
                            className={`block min-h-10 w-full rounded-lg px-2 py-2 text-left text-sm outline-none transition focus:ring-2 focus:ring-jscolors-crimson/20 ${
                              cellError
                                ? "border border-red-300 bg-red-50/60 text-red-700"
                                : "border border-transparent hover:bg-jscolors-crimson/[0.04]"
                            }`}
                            onFocus={() => setActiveCell({ rowIndex, columnIndex })}
                            onClick={() => {
                              setActiveCell({ rowIndex, columnIndex })
                              setEditingCell({ rowIndex, columnIndex })
                            }}
                            onDoubleClick={() => setEditingCell({ rowIndex, columnIndex })}
                          >
                            {cellValue || <span className="text-jscolors-text/20"> </span>}
                          </button>
                        )}
                        {cellError ? (
                          <p className="mt-1 px-1 text-[11px] leading-4 text-red-600">
                            {cellError.message}
                            {cellError.suggestion ? ` Suggestion: ${cellError.suggestion}` : ""}
                          </p>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-xs text-jscolors-text/50">Submitting…</p>}
    </div>
  )
}
