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
    Array.from({ length: 8 }, () => Object.fromEntries(columns.map((column) => [column.key, ""]))),
  )
  const [focus, setFocus] = useState<{ rowIndex: number; columnIndex: number } | null>(null)
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
    console.log("SUBMIT PAYLOAD:", payload)
    setError("")
    setCellErrors([])
    setBulkFixes([])
    setLoading(true)
    onLoadingChange?.(true)
    try {
      await onSubmit(payload)
    } catch (err: unknown) {
      console.error("AddSubproject error:", err)
      console.error("status:", (err as { response?: { status?: number } })?.response?.status)
      console.error("data:", (err as { response?: { data?: { detail?: unknown } } })?.response?.data)
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

  return (
    <div className="space-y-5 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/70">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Receiving Date</span>
        <input
          type="date"
          value={batchDate}
          onChange={(event) => setBatchDate(event.target.value)}
          className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
        />
      </label>
      <div>
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
                  {columns.map((column, columnIndex) => {
                    const cellError = cellErrors.find((item) => item.row_index === rowIndex && item.field === column.key)
                    return (
                      <td key={column.key} className="border-r border-t border-jscolors-crimson/10 p-1 align-top">
                        <FieldRenderer
                          mode="input"
                          field={{
                            ...column,
                            type: "text",
                          }}
                          value={String(row[column.key] ?? "")}
                          onFocus={() => setFocus({ rowIndex, columnIndex })}
                          onChange={(value) => updateCell(rowIndex, column.key, String(value))}
                          className={`w-full rounded-lg px-2 py-2 outline-none ${cellError ? "border border-red-300 text-red-700" : ""}`}
                        />
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
