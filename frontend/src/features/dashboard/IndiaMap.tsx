import { useMemo, useRef, useState, type MouseEvent } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"

import indiaGeoRaw from "../../assets/india-states.geojson?raw"

const TOOLTIP_WIDTH = 260
const TOOLTIP_HEIGHT = 140

// Small UTs/regions that need a dot marker instead of a polygon
const TINY_REGION_MARKERS: Record<string, [number, number]> = {
  Chandigarh: [76.78, 30.73],
  "Dadra and Nagar Haveli and Daman and Diu": [72.95, 20.3],
  Delhi: [77.1, 28.65],
  Lakshadweep: [72.7, 10.6],
  Puducherry: [79.82, 11.93],
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

type GeoFeature = {
  type: "Feature"
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown }
}

type GeoCollection = {
  type: "FeatureCollection"
  features: GeoFeature[]
}

const indiaGeo = JSON.parse(indiaGeoRaw) as GeoCollection

function interpolateColor(t: number): string {
  // 0 → #D9C7C7 (light warm grey), 1 → #8B1A1A (deep crimson)
  const from = [217, 199, 199]
  const to = [139, 26, 26]
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return `rgb(${r},${g},${b})`
}

function hoverColor(t: number): string {
  const tClamped = Math.min(1, t + 0.15)
  return interpolateColor(tClamped)
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
    () => new Map(rows.map((row) => [normalizeLabel(row.label), row])),
    [rows],
  )
  const knownStateLabels = useMemo(
    () => new Set(states.map((s) => normalizeLabel(s.label))),
    [states],
  )
  const maxCount = useMemo(
    () => Math.max(1, ...rows.map((r) => r.count)),
    [rows],
  )
  const markerRows = useMemo(
    () =>
      Object.entries(TINY_REGION_MARKERS)
        .map(([name, coordinates]) => ({
          name,
          coordinates,
          row: rowByState.get(normalizeLabel(name)),
        }))
        .filter((item) => knownStateLabels.has(normalizeLabel(item.name))),
    [knownStateLabels, rowByState],
  )

  function handleMouseEnter(
    event: MouseEvent<SVGPathElement | SVGCircleElement>,
    name: string,
    count: number,
    row: MapRow | undefined,
  ) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const rawX = (event as MouseEvent<SVGPathElement>).clientX - rect.left
    const rawY = (event as MouseEvent<SVGPathElement>).clientY - rect.top
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
    <div
      ref={containerRef}
      className="relative rounded-[24px] border border-jscolors-crimson/10 bg-[#FBF7F6] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 980, center: [82.8, 23.5] }}
        style={{ width: "100%", height: "540px", background: "#F7EFEE" }}
      >
        <Geographies geography={indiaGeo}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, unknown> }> }) =>
            geographies.map((geo) => {
              const name = String(geo.properties?.st_nm ?? geo.properties?.name ?? "")
              // Skip tiny regions rendered as markers
              if (name in TINY_REGION_MARKERS) return null
              const row = rowByState.get(normalizeLabel(name))
              const count = row?.count ?? 0
              const t = count > 0 ? Math.sqrt(count / maxCount) : 0
              const fill = interpolateColor(t)
              const fillHover = hoverColor(t)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  stroke="#FFF6F4"
                  strokeWidth={0.8}
                  fill={fill}
                  onMouseEnter={(e: MouseEvent<SVGPathElement>) => handleMouseEnter(e, name, count, row)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: fillHover },
                    pressed: { outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>

        {markerRows.map((marker) => {
          const count = marker.row?.count ?? 0
          const t = count > 0 ? Math.sqrt(count / maxCount) : 0
          return (
            <Marker key={marker.name} coordinates={marker.coordinates}>
              <circle
                r={6}
                fill={interpolateColor(t)}
                stroke="#ffffff"
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) =>
                  handleMouseEnter(
                    e as unknown as MouseEvent<SVGPathElement>,
                    marker.name,
                    count,
                    marker.row,
                  )
                }
                onMouseLeave={() => setTooltip(null)}
              />
            </Marker>
          )
        })}
      </ComposableMap>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-50 w-[260px] rounded-2xl border border-jscolors-crimson/10 bg-white px-4 py-3 text-sm shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-syne text-lg font-semibold text-jscolors-crimson">{tooltip.label}</div>
          <div className="mt-1 text-jscolors-text/70">{tooltip.count} open sites</div>
          <div className="mt-2 space-y-1 text-xs text-jscolors-text/60">
            {tooltip.projects.length
              ? tooltip.projects.map((p) => (
                  <div key={p.project_label}>
                    {p.project_label}: {p.count}
                  </div>
                ))
              : <div>No project breakdown</div>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}
