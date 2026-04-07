import { useMemo } from "react"
import { Link } from "react-router-dom"

import FieldRenderer from "./FieldRenderer"

type Column = {
  key: string
  label: string
  type?: string
  align?: "left" | "right"
  minWidth?: number
  groupMerge?: boolean
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column[]
  rows: T[]
  rowHref?: (row: T) => string
  onRowClick?: (row: T) => void
  getRowClassName?: (row: T) => string
  gridTemplateColumns?: string
  loading?: boolean
  emptyState?: React.ReactNode
  groupBy?: string
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowHref,
  onRowClick,
  getRowClassName,
  gridTemplateColumns: gridTemplateColumnsProp,
  loading,
  emptyState,
  groupBy,
}: DataTableProps<T>) {
  const gridTemplateColumns = gridTemplateColumnsProp ?? columns.map(col => `minmax(${col.minWidth ?? 180}px, 1fr)`).join(" ")
  const minTableWidth = columns.length
    ? columns.reduce((sum, col) => sum + (col.minWidth ?? 180), 0) + (columns.length - 1) * 16 + 40
    : 0

  const rowsWithMeta = useMemo(() => {
    if (!groupBy) return rows.map(row => ({ row, isFirstInGroup: true }))
    return rows.map((row, i) => ({
      row,
      isFirstInGroup: i === 0 || row[groupBy] !== rows[i - 1][groupBy],
    }))
  }, [rows, groupBy])

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-[24px] border border-jscolors-crimson/10 bg-white overflow-hidden">
      {/* overflow-x-auto scrolls header + rows together horizontally.
          overflow-y-clip clips without creating a vertical scroll container,
          so the rows section's overflow-y-auto is not trapped. */}
      <div className="flex flex-col flex-1 min-h-0 overflow-x-auto overflow-y-clip">

        {/* Header — fixed, never scrolls vertically */}
        <div
          className="shrink-0 grid gap-4 border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50"
          style={{ gridTemplateColumns, ...(minTableWidth ? { minWidth: minTableWidth } : {}) }}
        >
          {columns.map((column) => (
            <div key={column.key} className={column.align === "right" ? "text-right pr-4" : ""}>
              {column.label}
            </div>
          ))}
        </div>

        {/* Rows — only this section scrolls vertically */}
        <div className="flex-1 overflow-y-auto" style={minTableWidth ? { minWidth: minTableWidth } : undefined}>
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-jscolors-text/50">Loading...</div>
          )}
          {!loading && rows.length === 0 && (
            emptyState
              ? <div className="px-5 py-8">{emptyState}</div>
              : <div className="px-5 py-8 text-center text-sm text-jscolors-text/50">No results.</div>
          )}
          {!loading && rowsWithMeta.map(({ row, isFirstInGroup }, index) => {
            const isClickable = !!(rowHref || onRowClick)
            const content = (
              <div
                className={`grid gap-4 border-b border-jscolors-crimson/8 px-5 py-4 transition hover:bg-jscolors-gold/10${isClickable ? " cursor-pointer" : ""}`}
                style={{ gridTemplateColumns }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="min-w-0"
                    style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                  >
                    {column.groupMerge && !isFirstInGroup ? null : (
                      <>
                        <div className="hidden">{column.label}</div>
                        <div className={`text-sm text-jscolors-text${column.align === "right" ? " text-right pr-4" : ""}`}>
                          {column.render
                            ? column.render(row[column.key], row as Record<string, unknown>)
                            : <div className="truncate"><FieldRenderer type={column.type} value={row[column.key]} /></div>
                          }
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
            const extraCls = getRowClassName?.(row) ?? ""
            if (rowHref) {
              return (
                <Link key={index} to={rowHref(row)} className={`block ${extraCls}`}>
                  {content}
                </Link>
              )
            }
            if (onRowClick) {
              return (
                <div key={index} className={extraCls} onClick={() => onRowClick(row)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onRowClick(row)}>
                  {content}
                </div>
              )
            }
            return <div key={index} className={extraCls}>{content}</div>
          })}
        </div>

      </div>
    </div>
  )
}
