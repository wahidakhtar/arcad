import { useEffect, useMemo, useState } from "react"

import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import IndiaMap from "./IndiaMap"

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeKey = "all" | "7d" | "30d" | "custom"

type PinnedMetrics = {
  pending_pos?: number
  pending_invoices?: number
  pending_transactions?: number
  pending_wcc?: number
  pending_tx_copy?: number
  pending_reports?: number
  open_tickets?: number
  active_sites?: number
  down_sites?: number
  expired_recharges?: number
}

type PeriodMetrics = {
  sites_received?: number
  sites_in_progress?: number
  sites_completed?: number
  new_users?: number
  new_sites?: number
  terminated_sites?: number
}

type SummaryResponse = {
  pinned: PinnedMetrics
  period: PeriodMetrics
}

type MapRow = {
  state_id: number
  label: string
  count: number
  projects?: Array<{ project_key: string; project_label: string; count: number }>
}

type StateRow = { id: number; label: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Custom range", value: "custom" },
]

const MAP_PROJECTS = new Set(["ma", "mc", "md"])

// ─── Role helpers ─────────────────────────────────────────────────────────────

function useDeptKeys() {
  const { roles } = useAuth()
  return useMemo(() => new Set(roles.map((r) => r.dept_key)), [roles])
}

function useProjectTabs() {
  const { projectKeys, projectLabels } = useAuth()
  const tabs = useMemo(() => {
    const keys = [...new Set(projectKeys)].filter(Boolean).sort()
    return keys.length > 1 ? ["all", ...keys] : []
  }, [projectKeys])
  return { tabs, projectLabels }
}

function useShowMap() {
  const depts = useDeptKeys()
  return depts.has("mgmt") || depts.has("ops")
}

// ─── Pinned metric definitions ────────────────────────────────────────────────

type MetricDef = { key: keyof PinnedMetrics; label: string; alert?: boolean }

function usePinnedDefs(activeTab: string): MetricDef[] {
  const depts = useDeptKeys()
  const { projectKeys } = useAuth()
  const isBbTab = activeTab === "bb" || (activeTab === "all" && projectKeys.length === 1 && projectKeys[0] === "bb")

  if (depts.has("mgmt")) {
    return [
      { key: "pending_pos", label: "Pending POs", alert: true },
      { key: "pending_invoices", label: "Pending Invoices", alert: true },
      { key: "pending_transactions", label: "Pending Transactions", alert: true },
      { key: "pending_wcc", label: "Pending WCC", alert: true },
      { key: "pending_tx_copy", label: "Pending Tx Copy", alert: true },
      { key: "pending_reports", label: "Pending Reports", alert: true },
      { key: "open_tickets", label: "Open Tickets" },
    ]
  }
  if (depts.has("acc")) {
    return [
      { key: "pending_pos", label: "Pending POs", alert: true },
      { key: "pending_invoices", label: "Pending Invoices", alert: true },
      { key: "pending_transactions", label: "Pending Transactions", alert: true },
    ]
  }
  if (depts.has("ops")) {
    if (isBbTab) {
      return [
        { key: "active_sites", label: "Active Sites" },
        { key: "down_sites", label: "Down Sites", alert: true },
        { key: "expired_recharges", label: "Expired Recharges", alert: true },
        { key: "open_tickets", label: "Open Tickets" },
      ]
    }
    return [
      { key: "open_tickets", label: "Open Tickets" },
      { key: "pending_wcc", label: "Pending WCC", alert: true },
      { key: "pending_tx_copy", label: "Pending Tx Copy", alert: true },
      { key: "pending_reports", label: "Pending Reports", alert: true },
    ]
  }
  return []
}

type PeriodDef = { key: keyof PeriodMetrics; label: string }

function usePeriodDefs(activeTab: string): PeriodDef[] {
  const depts = useDeptKeys()
  const { projectKeys } = useAuth()
  const isBbTab = activeTab === "bb" || (activeTab === "all" && projectKeys.length === 1 && projectKeys[0] === "bb")

  if (depts.has("mgmt")) {
    return [
      { key: "sites_received", label: "Sites Received" },
      { key: "sites_in_progress", label: "Sites In Progress" },
      { key: "sites_completed", label: "Sites Completed" },
      { key: "new_users", label: "New Users" },
    ]
  }
  if (depts.has("acc")) {
    return [{ key: "sites_completed", label: "Sites Completed" }]
  }
  if (depts.has("ops")) {
    if (isBbTab) {
      return [
        { key: "new_sites", label: "New Sites" },
        { key: "terminated_sites", label: "Terminated Sites" },
      ]
    }
    return [
      { key: "sites_received", label: "Sites Received" },
      { key: "sites_in_progress", label: "In Progress" },
      { key: "sites_completed", label: "Sites Completed" },
    ]
  }
  if (depts.has("hr")) {
    return [{ key: "new_users", label: "New Users" }]
  }
  return []
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tabs, projectLabels } = useProjectTabs()
  const showMap = useShowMap()
  const depts = useDeptKeys()

  const [activeTab, setActiveTab] = useState<string>("all")
  const [rangeKey, setRangeKey] = useState<RangeKey>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [summary, setSummary] = useState<SummaryResponse>({ pinned: {}, period: {} })
  const [mapRows, setMapRows] = useState<MapRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])

  const projectKey = activeTab === "all" ? undefined : activeTab
  const pinnedDefs = usePinnedDefs(activeTab)
  const periodDefs = usePeriodDefs(activeTab)

  // Fetch summary whenever tab or date range changes
  useEffect(() => {
    const params: Record<string, string> = { range_key: rangeKey }
    if (projectKey) params.project_key = projectKey
    if (rangeKey === "custom" && startDate) params.start_date = startDate
    if (rangeKey === "custom" && endDate) params.end_date = endDate

    void api.get<SummaryResponse>("/dashboard/summary", { params }).then((r) => setSummary(r.data))
  }, [projectKey, rangeKey, startDate, endDate])

  // Fetch map + states (map uses no date range — always live snapshot)
  useEffect(() => {
    if (!showMap) return
    const params: Record<string, string> = {}
    if (projectKey) params.project_key = projectKey

    void Promise.all([
      api.get<MapRow[]>("/dashboard/map", { params }),
      api.get<StateRow[]>("/indian-states"),
    ]).then(([mapRes, statesRes]) => {
      setMapRows(mapRes.data)
      setStates(statesRes.data)
    })
  }, [showMap, projectKey])

  const showMapForTab = showMap && (activeTab === "all" || MAP_PROJECTS.has(activeTab))

  return (
    <div className="h-full overflow-y-auto space-y-6">

      {/* Project tabs */}
      {tabs.length > 0 && (
        <section className="glass-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/40 mr-2">
              Project
            </p>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                  activeTab === tab
                    ? "bg-jscolors-crimson text-white"
                    : "bg-jscolors-crimson/8 text-jscolors-text/60 hover:bg-jscolors-crimson/15",
                ].join(" ")}
              >
                {tab === "all" ? "All" : (projectLabels[tab] ?? tab.toUpperCase())}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Pinned metrics — no date filter */}
      {pinnedDefs.length > 0 && (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {pinnedDefs.map(({ key, label, alert }) => {
              const val = summary.pinned[key]
              if (val === undefined) return null
              return (
                <PinnedCard key={key} label={label} value={val} alert={alert} />
              )
            })}
          </div>
        </section>
      )}

      {/* Period metrics + inline range selector */}
      {periodDefs.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/40 mr-2">
              Period
            </p>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRangeKey(opt.value as RangeKey)}
                className={[
                  "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                  rangeKey === opt.value
                    ? "bg-jscolors-crimson text-white"
                    : "bg-jscolors-crimson/8 text-jscolors-text/60 hover:bg-jscolors-crimson/15",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
            {rangeKey === "custom" && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-jscolors-crimson/20 bg-white px-3 py-1.5 text-xs text-jscolors-text focus:outline-none"
                />
                <span className="text-xs text-jscolors-text/40">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-jscolors-crimson/20 bg-white px-3 py-1.5 text-xs text-jscolors-text focus:outline-none"
                />
              </>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {periodDefs.map(({ key, label }) => {
              const val = summary.period[key]
              if (val === undefined) return null
              return <StatCard key={key} label={label} value={val} />
            })}
          </div>
        </section>
      )}

      {/* Map */}
      {showMapForTab && (
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">
            Open Sites by State
          </p>
          <div className="mt-1 text-sm text-jscolors-text/55">
            {mapRows.reduce((s, r) => s + r.count, 0)} open sites across{" "}
            {mapRows.length} states
          </div>
          <div className="mt-4">
            <IndiaMap rows={mapRows} states={states} />
          </div>
        </section>
      )}

      {/* HR: no map, minimal layout */}
      {depts.has("hr") && !depts.has("mgmt") && periodDefs.length === 0 && (
        <section className="glass-panel p-6 text-sm text-jscolors-text/50">
          No metrics available for the selected range.
        </section>
      )}
    </div>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

function PinnedCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="glass-panel p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.26em] text-jscolors-text/40">
        {label}
      </div>
      <div
        className={[
          "mt-3 font-syne text-4xl font-bold",
          alert && value > 0 ? "text-jscolors-crimson" : "text-jscolors-text/70",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.26em] text-jscolors-text/40">
        {label}
      </div>
      <div className="mt-3 font-syne text-4xl font-bold text-jscolors-crimson">{value}</div>
    </div>
  )
}
