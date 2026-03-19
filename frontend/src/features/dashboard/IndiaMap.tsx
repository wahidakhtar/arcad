import { useMemo, useRef, useState, type MouseEvent } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import indiaGeoUrl from "../../assets/india-full.geojson?url"

const TOOLTIP_WIDTH = 260
const TOOLTIP_HEIGHT = 140 // conservative estimate for clamping vertical

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

export default function IndiaMap({ rows, states }: { rows: MapRow[]; states: StateRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    label: string
    count: number
    projects: Array<{ project_label: string; count: number }>
    x: number
    y: number
  } | null>(null)

  const rowByState = useMemo(
    () => new Map(rows.map((row) => [normalizeStateLabel(row.label), row])),
    [rows],
  )
  const knownStateLabels = useMemo(() => new Set(states.map((state) => normalizeStateLabel(state.label))), [states])

  function handleMouseEnter(event: MouseEvent<SVGPathElement>, name: string, count: number, row: MapRow | undefined) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top
    // clamp so tooltip never overflows the right or bottom of the container
    const x = Math.min(rawX + 12, rect.width - TOOLTIP_WIDTH - 16)
    const y = Math.min(rawY + 12, rect.height - TOOLTIP_HEIGHT - 8)
    setTooltip({
      label: name,
      count,
      projects: row?.projects?.map((p) => ({ project_label: p.project_label, count: p.count })) ?? [],
      x,
      y,
    })
  }

  return (
    <div ref={containerRef} className="relative rounded-[24px] border border-jscolors-crimson/10 bg-white/70 p-4">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 920, center: [82, 22] }} style={{ width: "100%", height: "540px" }}>
        <Geographies geography={indiaGeoUrl}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, unknown> }> }) =>
            geographies.map((geography: { rsmKey: string; properties: Record<string, unknown> }) => {
              const name = String(geography.properties?.st_nm ?? geography.properties?.ST_NM ?? geography.properties?.name ?? geography.properties?.NAME_1 ?? "")
              if (knownStateLabels.size && !knownStateLabels.has(normalizeStateLabel(name))) {
                return null
              }
              const row = rowByState.get(normalizeStateLabel(name))
              const count = row?.count ?? 0
              return (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  stroke="#ffffff"
                  strokeWidth={0.9}
                  fill={count > 0 ? "#8B1A1A" : "#E7D8D8"}
                  onMouseEnter={(event: MouseEvent<SVGPathElement>) => handleMouseEnter(event, name, count, row)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: count > 0 ? "#6F1515" : "#D9C4C4" },
                    pressed: { outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-50 w-[260px] rounded-2xl border border-jscolors-crimson/10 bg-white px-4 py-3 text-sm shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-syne text-lg font-semibold text-jscolors-crimson">{tooltip.label}</div>
          <div className="mt-1 text-jscolors-text/70">{tooltip.count} visible sites</div>
          <div className="mt-2 space-y-1 text-xs text-jscolors-text/60">
            {tooltip.projects.length ? tooltip.projects.map((project) => (
              <div key={project.project_label}>{project.project_label}: {project.count}</div>
            )) : <div>No project counts</div>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeStateLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}
