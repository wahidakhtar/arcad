type FilterOption = {
  label: string
  value: string
}

type SelectFilter = {
  key: string
  label: string
  type: "select"
  value: string
  options: FilterOption[]
}

type DateRangeFilter = {
  key: string
  label: string
  type: "daterange"
  startKey: string
  endKey: string
  startValue: string
  endValue: string
}

type BadgeFilter = {
  key: string
  label: string
  type: "badge"
  value?: string
  options: Array<FilterOption & { color?: string | null }>
}

export type FilterBarConfig = SelectFilter | DateRangeFilter | BadgeFilter

export default function FilterBar({
  filters,
  onFilterChange,
}: {
  filters: FilterBarConfig[]
  onFilterChange: (key: string, value: string) => void
}) {
  if (!filters.length) return null

  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map((filter) => {
        if (filter.type === "select") {
          return (
            <label key={filter.key} className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{filter.label}</span>
              <select
                value={filter.value}
                onChange={(event) => onFilterChange(filter.key, event.target.value)}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )
        }

        if (filter.type === "daterange") {
          return (
            <div key={filter.key} className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{filter.label} Start</span>
                <input
                  type="date"
                  value={filter.startValue}
                  onChange={(event) => onFilterChange(filter.startKey, event.target.value)}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{filter.label} End</span>
                <input
                  type="date"
                  value={filter.endValue}
                  onChange={(event) => onFilterChange(filter.endKey, event.target.value)}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                />
              </label>
            </div>
          )
        }

        return (
          <div key={filter.key} className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-jscolors-text/60">{filter.label}</div>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((option) => {
                const active = filter.value === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFilterChange(filter.key, option.value)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.08em] ${
                      active ? "shadow-sm" : ""
                    }`}
                    style={{
                      borderColor: option.color ? `${option.color}55` : active ? "#8B1A1A" : "rgba(139, 26, 26, 0.15)",
                      backgroundColor: active ? option.color ?? "#8B1A1A" : option.color ? `${option.color}18` : "white",
                      color: active ? "white" : option.color ?? "#8B1A1A",
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
