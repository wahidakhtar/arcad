import { useEffect, useMemo, useState } from "react"

import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import {
  tableWrapCls,
  tableCls,
  theadRowCls,
  thCls,
  tbodyRowCls,
  tdCls,
} from "../constants"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColumnMeta {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

interface TableMeta {
  name: string
  columns: ColumnMeta[]
  row_count: number
}

interface SchemaMeta {
  schema: string
  tables: TableMeta[]
}

interface TableData {
  schema: string
  table: string
  total: number
  limit: number
  offset: number
  columns: string[]
  rows: unknown[][]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RowCountBadge({ count }: { count: number }) {
  if (count < 0) return <span className="text-xs text-jscolors-text/30 ml-1">?</span>
  return (
    <span className="ml-1.5 rounded-full bg-jscolors-crimson/8 px-1.5 py-0.5 text-[10px] font-semibold text-jscolors-crimson/60 tabular-nums">
      {count.toLocaleString()}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchemaBrowserPage() {
  const { can } = useAuth()

  const [schemas, setSchemas] = useState<SchemaMeta[]>([])
  const [schemasLoading, setSchemasLoading] = useState(true)
  const [schemasError, setSchemasError] = useState("")

  const [selected, setSelected] = useState<{ schema: string; table: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [filter, setFilter] = useState("")

  const [activeTab, setActiveTab] = useState<"columns" | "data">("columns")
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataOffset, setDataOffset] = useState(0)

  if (!can("admin", "read")) {
    return <div className="p-6 text-red-600">Access denied.</div>
  }

  // Load all schemas on mount
  useEffect(() => {
    setSchemasLoading(true)
    api
      .get<SchemaMeta[]>("/admin/schema/tables")
      .then((res) => {
        setSchemas(res.data)
        setSchemasError("")
        // Auto-select first table in schema_core
        const core = res.data.find((s) => s.schema === "schema_core") ?? res.data[0]
        if (core?.tables.length) {
          const first = core.tables[0]
          setSelected({ schema: core.schema, table: first.name })
          setExpanded(new Set([core.schema]))
        }
      })
      .catch(() => setSchemasError("Failed to load schema list."))
      .finally(() => setSchemasLoading(false))
  }, [])

  // Load table data when selected table or offset changes
  useEffect(() => {
    if (!selected || activeTab !== "data") return
    setDataLoading(true)
    setTableData(null)
    api
      .get<TableData>("/admin/schema/table-data", {
        params: { schema: selected.schema, table: selected.table, limit: 100, offset: dataOffset },
      })
      .then((res) => setTableData(res.data))
      .finally(() => setDataLoading(false))
  }, [selected, activeTab, dataOffset])

  // Reset offset when selection changes
  useEffect(() => {
    setDataOffset(0)
  }, [selected])

  const handleSelectTable = (schema: string, table: string) => {
    setSelected({ schema, table })
    setActiveTab("columns")
    setTableData(null)
  }

  const toggleExpanded = (schema: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(schema)) {
        next.delete(schema)
      } else {
        next.add(schema)
      }
      return next
    })
  }

  // Client-side filter
  const filteredSchemas = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return schemas
    return schemas
      .map((s) => ({
        ...s,
        tables: s.tables.filter(
          (t) => t.name.toLowerCase().includes(q) || s.schema.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.tables.length > 0)
  }, [schemas, filter])

  const selectedTableMeta = useMemo(() => {
    if (!selected) return null
    const s = schemas.find((s) => s.schema === selected.schema)
    return s?.tables.find((t) => t.name === selected.table) ?? null
  }, [schemas, selected])

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-72 flex-shrink-0 flex flex-col glass-panel overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-jscolors-crimson/10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/50 mb-2">
            Schema Browser
          </h2>
          <input
            type="text"
            placeholder="Filter tables…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {schemasLoading && (
            <p className="px-4 py-3 text-sm text-jscolors-text/40">Loading…</p>
          )}
          {schemasError && (
            <p className="px-4 py-3 text-sm text-red-500">{schemasError}</p>
          )}
          {!schemasLoading &&
            filteredSchemas.map((s) => {
              const isOpen = expanded.has(s.schema)
              return (
                <div key={s.schema}>
                  <button
                    onClick={() => toggleExpanded(s.schema)}
                    className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-jscolors-text/50 hover:text-jscolors-text/80 transition-colors"
                  >
                    <span className="text-[10px] transition-transform duration-150" style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                      ▶
                    </span>
                    {s.schema.replace("schema_", "")}
                    <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-jscolors-text/30">
                      {s.tables.length}t
                    </span>
                  </button>
                  {isOpen &&
                    s.tables.map((t) => {
                      const isActive =
                        selected?.schema === s.schema && selected?.table === t.name
                      return (
                        <button
                          key={t.name}
                          onClick={() => handleSelectTable(s.schema, t.name)}
                          className={`flex w-full items-center gap-1 pl-8 pr-4 py-1 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-jscolors-crimson/8 text-jscolors-crimson font-medium"
                              : "text-jscolors-text hover:bg-jscolors-crimson/5"
                          }`}
                        >
                          <span className="truncate">{t.name}</span>
                          <RowCountBadge count={t.row_count} />
                        </button>
                      )
                    })}
                </div>
              )
            })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-jscolors-text/30 text-sm">
            Select a table to inspect
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="px-6 pt-4 pb-3 border-b border-jscolors-crimson/10 flex items-center gap-2">
              <span className="text-xs font-semibold text-jscolors-text/40 uppercase tracking-[0.2em]">
                {selected.schema}
              </span>
              <span className="text-jscolors-text/25">/</span>
              <span className="text-sm font-semibold text-jscolors-text">
                {selected.table}
              </span>
              {selectedTableMeta && (
                <RowCountBadge count={selectedTableMeta.row_count} />
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-6 pt-3 border-b border-jscolors-crimson/10">
              {(["columns", "data"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 pb-2 text-sm capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-jscolors-crimson text-jscolors-crimson font-medium"
                      : "border-transparent text-jscolors-text/50 hover:text-jscolors-text"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === "columns" && selectedTableMeta && (
                <div className={tableWrapCls}>
                  <table className={tableCls}>
                    <thead>
                      <tr className={theadRowCls}>
                        <th className={thCls}>Column</th>
                        <th className={thCls}>Type</th>
                        <th className={thCls}>Nullable</th>
                        <th className={thCls}>Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTableMeta.columns.map((col) => (
                        <tr key={col.name} className={tbodyRowCls}>
                          <td className={`${tdCls} font-mono font-medium`}>{col.name}</td>
                          <td className={`${tdCls} font-mono text-jscolors-text/60`}>{col.type}</td>
                          <td className={tdCls}>
                            {col.nullable ? (
                              <span className="text-jscolors-text/40">yes</span>
                            ) : (
                              <span className="font-medium text-jscolors-crimson/70">no</span>
                            )}
                          </td>
                          <td className={`${tdCls} font-mono text-xs text-jscolors-text/50 max-w-[200px] truncate`}>
                            {col.default ?? <span className="text-jscolors-text/25">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "data" && (
                <>
                  {dataLoading && (
                    <p className="text-sm text-jscolors-text/40">Loading rows…</p>
                  )}
                  {!dataLoading && tableData && (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-jscolors-text/40">
                          Rows {dataOffset + 1}–{Math.min(dataOffset + 100, tableData.total)} of{" "}
                          {tableData.total.toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={dataOffset === 0}
                            onClick={() => setDataOffset((p) => Math.max(0, p - 100))}
                            className="rounded-lg border border-jscolors-crimson/15 px-3 py-1 text-xs disabled:opacity-30 hover:bg-jscolors-crimson/5"
                          >
                            ← Prev
                          </button>
                          <button
                            disabled={dataOffset + 100 >= tableData.total}
                            onClick={() => setDataOffset((p) => p + 100)}
                            className="rounded-lg border border-jscolors-crimson/15 px-3 py-1 text-xs disabled:opacity-30 hover:bg-jscolors-crimson/5"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                      <div className={tableWrapCls}>
                        <table className={tableCls} style={{ tableLayout: "auto" }}>
                          <thead>
                            <tr className={theadRowCls}>
                              {tableData.columns.map((col) => (
                                <th key={col} className={`${thCls} whitespace-nowrap`}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.rows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={tableData.columns.length}
                                  className="px-5 py-8 text-center text-sm text-jscolors-text/30"
                                >
                                  No rows
                                </td>
                              </tr>
                            ) : (
                              tableData.rows.map((row, ri) => (
                                <tr key={ri} className={tbodyRowCls}>
                                  {row.map((cell, ci) => (
                                    <td
                                      key={ci}
                                      className={`${tdCls} font-mono text-xs whitespace-nowrap max-w-[220px] truncate`}
                                      title={cell === null ? "NULL" : String(cell)}
                                    >
                                      {cell === null ? (
                                        <span className="text-jscolors-text/25">NULL</span>
                                      ) : typeof cell === "boolean" ? (
                                        <span className={cell ? "text-green-600" : "text-jscolors-text/40"}>
                                          {String(cell)}
                                        </span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
