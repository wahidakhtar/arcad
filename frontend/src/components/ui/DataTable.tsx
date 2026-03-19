import { Link } from "react-router-dom"

import FieldRenderer from "./FieldRenderer"

type Column = {
  key: string
  label: string
  type?: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column[]
  rows: T[]
  rowHref?: (row: T) => string
  getRowClassName?: (row: T) => string
}

export default function DataTable<T extends Record<string, unknown>>({ columns, rows, rowHref, getRowClassName }: DataTableProps<T>) {
  const gridTemplateColumns = `repeat(${Math.max(columns.length, 1)}, minmax(180px, 1fr))`
  return (
    <div className="overflow-x-auto rounded-[24px] border border-jscolors-crimson/10 bg-white">
      <div className="grid min-w-full grid-cols-1">
        <div className="hidden gap-4 border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50 md:grid" style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div key={column.key}>{column.label}</div>
          ))}
        </div>
        {rows.map((row, index) => {
          const content = (
            <div className="grid gap-3 border-b border-jscolors-crimson/8 px-5 py-4 transition hover:bg-jscolors-gold/10 md:grid" style={{ gridTemplateColumns }}>
              {columns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/35 md:hidden">{column.label}</div>
                  <div className="text-sm text-jscolors-text">
                    {column.render ? column.render(row[column.key], row) : (
                      <div className="truncate"><FieldRenderer type={column.type} value={row[column.key]} /></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
          const extraCls = getRowClassName?.(row) ?? ""
          if (!rowHref) {
            return <div key={index} className={extraCls}>{content}</div>
          }
          return (
            <Link key={index} to={rowHref(row)} className={`block ${extraCls}`}>
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
