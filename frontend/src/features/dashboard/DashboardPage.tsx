import { useEffect, useMemo, useState } from "react"

import FilterBar, { type FilterBarConfig } from "../../components/ui/FilterBar"
import { getPageConfig } from "../../config"
import { api } from "../../lib/api"
import IndiaMap from "./IndiaMap"

type RangeKey = "all" | "7d" | "30d" | "custom"

type SummaryResponse = {
  users: number
  requested_transactions: number
  open_tickets: number
}

type MapRow = {
  state_id: number
  label: string
  count: number
  projects?: Array<{ project_key: string; project_label: string; count: number }>
}

type StateRow = {
  id: number
  label: string
}

export default function DashboardPage() {
  const config = getPageConfig("dashboard")
  const [summary, setSummary] = useState<SummaryResponse>({ users: 0, requested_transactions: 0, open_tickets: 0 })
  const [mapRows, setMapRows] = useState<MapRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [rangeKey, setRangeKey] = useState<RangeKey>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    const params = {
      range_key: rangeKey,
      start_date: rangeKey === "custom" && startDate ? startDate : undefined,
      end_date: rangeKey === "custom" && endDate ? endDate : undefined,
    }
    void Promise.all([
      api.get("/dashboard/summary", { params }),
      api.get("/dashboard/map", { params }),
      api.get("/indian-states"),
    ]).then(([summaryResponse, mapResponse, statesResponse]) => {
      setSummary(summaryResponse.data)
      setMapRows(mapResponse.data)
      setStates(statesResponse.data)
    })
  }, [endDate, rangeKey, startDate])

  const countByState = useMemo(
    () => new Map(mapRows.map((row) => [row.label.toLowerCase().replace(/[^a-z]/g, ""), row.count])),
    [mapRows],
  )
  const totalMappedSites = states.reduce((total, state) => total + (countByState.get(state.label.toLowerCase().replace(/[^a-z]/g, "")) ?? 0), 0)
  const filterConfig: FilterBarConfig[] = [
    {
      key: "range_key",
      label: "Date Range",
      type: "badge",
      value: rangeKey,
      options: config.filterOptions,
    },
    ...(rangeKey === "custom"
      ? [
          {
            key: "custom_range",
            label: "Custom Range",
            type: "daterange" as const,
            startKey: "start_date",
            endKey: "end_date",
            startValue: startDate,
            endValue: endDate,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <section className="glass-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">Dashboard Filters</p>
            <h2 className="mt-2 font-syne text-3xl font-semibold text-jscolors-crimson">Date Range + role-aware scope</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-jscolors-text/60">
              KPI cards and state counts are filtered by your selected range and constrained by your account visibility.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <FilterBar
            filters={filterConfig}
            onFilterChange={(key, value) => {
              if (key === "range_key") setRangeKey(value as RangeKey)
              if (key === "start_date") setStartDate(value)
              if (key === "end_date") setEndDate(value)
            }}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {config.statCards.map((card) => (
          <StatCard key={card.key} label={card.label} value={summary[card.key as keyof SummaryResponse]} />
        ))}
      </section>

      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">India Map</p>
        <div className="mt-2 text-sm text-jscolors-text/55">Filtered site count across state-tagged recurring projects: {totalMappedSites}</div>
        <div className="mt-4">
          <IndiaMap rows={mapRows} states={states} />
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.26em] text-jscolors-text/40">{label}</div>
      <div className="mt-3 font-syne text-4xl font-bold text-jscolors-crimson">{value}</div>
    </div>
  )
}
