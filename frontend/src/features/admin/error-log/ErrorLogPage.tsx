import { useCallback, useEffect, useRef, useState } from "react"

import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import Modal from "../../../components/ui/Modal"
import {
  tableWrapCls,
  tableCls,
  theadRowCls,
  thCls,
  tbodyRowCls,
  tdCls,
  fieldCls,
  labelCls,
} from "../constants"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorLogItem {
  id: number
  created_at: string
  user_id: number | null
  username: string | null
  page_url: string
  error_type: string
  error_message: string
  stack_trace: string | null
  http_status: number | null
  http_url: string | null
  user_agent: string
  extra: Record<string, unknown> | null
}

interface ErrorLogResponse {
  total: number
  limit: number
  offset: number
  items: ErrorLogItem[]
}

const ERROR_TYPES = ["", "api_error", "js_exception", "page_load_failure"]

function typeLabel(t: string): string {
  return { api_error: "API Error", js_exception: "JS Exception", page_load_failure: "Page Load" }[t] ?? t
}

function typeBadge(t: string) {
  const colors: Record<string, string> = {
    api_error: "bg-red-100 text-red-700",
    js_exception: "bg-orange-100 text-orange-700",
    page_load_failure: "bg-yellow-100 text-yellow-700",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[t] ?? "bg-gray-100 text-gray-600"}`}>
      {typeLabel(t)}
    </span>
  )
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ErrorLogPage() {
  const { can } = useAuth()

  const [items, setItems] = useState<ErrorLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [filterType, setFilterType] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [filterSince, setFilterSince] = useState("")
  const [appliedFilters, setAppliedFilters] = useState({ type: "", user: "", since: "" })

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detail modal
  const [detailItem, setDetailItem] = useState<ErrorLogItem | null>(null)

  if (!can("admin", "read")) {
    return <div className="p-6 text-red-600">Access denied.</div>
  }

  const fetchLogs = useCallback(
    (off: number, filters: typeof appliedFilters) => {
      setLoading(true)
      const params: Record<string, string | number> = { limit: 50, offset: off }
      if (filters.type) params.error_type = filters.type
      if (filters.user) params.user_id = Number(filters.user) || filters.user
      if (filters.since) params.since = filters.since
      api
        .get<ErrorLogResponse>("/error-log", { params })
        .then((res) => {
          setItems(res.data.items)
          setTotal(res.data.total)
          setError("")
        })
        .catch(() => setError("Failed to load error logs."))
        .finally(() => setLoading(false))
    },
    [],
  )

  // Initial load and when offset/filters change
  useEffect(() => {
    fetchLogs(offset, appliedFilters)
  }, [offset, appliedFilters, fetchLogs])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchLogs(offset, appliedFilters), 30_000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, offset, appliedFilters, fetchLogs])

  const applyFilters = () => {
    setOffset(0)
    setAppliedFilters({ type: filterType, user: filterUser, since: filterSince })
  }

  const clearFilters = () => {
    setFilterType("")
    setFilterUser("")
    setFilterSince("")
    setOffset(0)
    setAppliedFilters({ type: "", user: "", since: "" })
  }

  const LIMIT = 50

  return (
    <div className="h-full overflow-y-auto space-y-5">
      {/* Filter bar */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelCls}>Error Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={fieldCls + " w-44"}
            >
              {ERROR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t ? typeLabel(t) : "All types"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>User ID</label>
            <input
              type="text"
              placeholder="e.g. 3"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className={fieldCls + " w-28"}
            />
          </div>
          <div>
            <label className={labelCls}>Since</label>
            <input
              type="datetime-local"
              value={filterSince}
              onChange={(e) => setFilterSince(e.target.value)}
              className={fieldCls + " w-52"}
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={applyFilters}
              className="rounded-xl bg-jscolors-crimson px-4 py-2 text-sm font-semibold text-white hover:bg-jscolors-crimson/90"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="rounded-xl border border-jscolors-crimson/20 px-4 py-2 text-sm text-jscolors-text/60 hover:bg-jscolors-crimson/5"
            >
              Clear
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-jscolors-text/60 select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-jscolors-crimson"
              />
              Auto-refresh (30s)
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="glass-panel p-6">
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        {/* Pagination header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-jscolors-text/40">
            {total === 0 ? "No results" : `${offset + 1}–${Math.min(offset + LIMIT, total)} of ${total.toLocaleString()}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((p) => Math.max(0, p - LIMIT))}
              className="rounded-lg border border-jscolors-crimson/15 px-3 py-1 text-xs disabled:opacity-30 hover:bg-jscolors-crimson/5"
            >
              ← Prev
            </button>
            <button
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((p) => p + LIMIT)}
              className="rounded-lg border border-jscolors-crimson/15 px-3 py-1 text-xs disabled:opacity-30 hover:bg-jscolors-crimson/5"
            >
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-jscolors-text/40">Loading…</p>
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-jscolors-text/40">
            <span className="text-4xl">✅</span>
            <p className="text-sm">No errors logged</p>
          </div>
        ) : (
          <div className={tableWrapCls}>
            <table className={tableCls} style={{ tableLayout: "auto" }}>
              <thead>
                <tr className={theadRowCls}>
                  <th className={thCls}>Timestamp</th>
                  <th className={thCls}>User</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Message</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>API URL</th>
                  <th className={thCls}>Page URL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`${tbodyRowCls} cursor-pointer hover:bg-jscolors-crimson/5`}
                    onClick={() => setDetailItem(item)}
                  >
                    <td className={`${tdCls} whitespace-nowrap text-xs`}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className={tdCls}>
                      {item.username ? (
                        <span className="font-medium">{item.username}</span>
                      ) : (
                        <span className="text-jscolors-text/30">—</span>
                      )}
                    </td>
                    <td className={tdCls}>{typeBadge(item.error_type)}</td>
                    <td className={`${tdCls} max-w-[280px]`}>
                      <span className="truncate block text-xs font-mono" title={item.error_message}>
                        {truncate(item.error_message, 80)}
                      </span>
                    </td>
                    <td className={tdCls}>
                      {item.http_status ? (
                        <span
                          className={`font-mono font-semibold ${item.http_status >= 500 ? "text-red-600" : item.http_status >= 400 ? "text-orange-500" : "text-jscolors-text"}`}
                        >
                          {item.http_status}
                        </span>
                      ) : (
                        <span className="text-jscolors-text/25">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} max-w-[200px]`}>
                      <span className="truncate block text-xs font-mono text-jscolors-text/60" title={item.http_url ?? ""}>
                        {item.http_url ? truncate(item.http_url, 50) : <span className="text-jscolors-text/25">—</span>}
                      </span>
                    </td>
                    <td className={`${tdCls} max-w-[200px]`}>
                      <span className="truncate block text-xs text-jscolors-text/50" title={item.page_url}>
                        {truncate(item.page_url.replace(/^https?:\/\/[^/]+/, ""), 50)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailItem && (
        <Modal
          open={true}
          title={`Error #${detailItem.id} — ${typeLabel(detailItem.error_type)}`}
          onClose={() => setDetailItem(null)}
          size="lg"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className={labelCls}>Timestamp</span>
                <span className="text-jscolors-text">{new Date(detailItem.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className={labelCls}>User</span>
                <span className="text-jscolors-text">{detailItem.username ?? <span className="text-jscolors-text/40">anonymous</span>}</span>
              </div>
              {detailItem.http_status && (
                <div>
                  <span className={labelCls}>HTTP Status</span>
                  <span className="font-mono font-semibold text-jscolors-text">{detailItem.http_status}</span>
                </div>
              )}
              {detailItem.http_url && (
                <div className="col-span-2">
                  <span className={labelCls}>API URL</span>
                  <span className="font-mono text-jscolors-text break-all">{detailItem.http_url}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className={labelCls}>Page URL</span>
                <span className="font-mono text-jscolors-text break-all">{detailItem.page_url}</span>
              </div>
            </div>

            <div>
              <p className={labelCls}>Error Message</p>
              <pre className="mt-1 rounded-xl bg-jscolors-crimson/5 p-3 text-xs font-mono whitespace-pre-wrap break-all">
                {detailItem.error_message}
              </pre>
            </div>

            {detailItem.stack_trace && (
              <div>
                <p className={labelCls}>Stack Trace</p>
                <pre className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-jscolors-crimson/5 p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {detailItem.stack_trace}
                </pre>
              </div>
            )}

            {detailItem.extra && (
              <div>
                <p className={labelCls}>Extra</p>
                <pre className="mt-1 rounded-xl bg-jscolors-crimson/5 p-3 text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(detailItem.extra, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className={labelCls}>User Agent</p>
              <p className="text-xs text-jscolors-text/50 break-all">{detailItem.user_agent}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
