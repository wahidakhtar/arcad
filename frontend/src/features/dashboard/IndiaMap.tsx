import { useMemo, useRef, useState, type MouseEvent } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"

import indiaGeoRaw from "../../assets/india-full.geojson?raw"

const TOOLTIP_WIDTH = 260
const TOOLTIP_HEIGHT = 140
const TINY_REGION_MARKERS: Record<string, [number, number]> = {
  "Andaman and Nicobar Islands": [92.9, 11.7],
  Chandigarh: [76.78, 30.73],
  "Dadra and Nagar Haveli and Daman and Diu": [72.95, 20.3],
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

type Geometry = {
  type: "Polygon" | "MultiPolygon"
  coordinates: number[][][] | number[][][][]
}

type GeoFeature = {
  type: "Feature"
  properties: Record<string, unknown>
  geometry: Geometry
}

type GeoCollection = {
  type: "FeatureCollection"
  features: GeoFeature[]
}

const indiaGeo = JSON.parse(indiaGeoRaw) as GeoCollection

export default function IndiaMap({ rows, states }: { rows: MapRow[]; states: StateRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    label: string
    count: number
    projects: Array<{ project_label: string; count: number }>
    x: number
    y: number
  } | null>(null)

  const rowByState = useMemo(() => new Map(rows.map((row) => [normalizeStateLabel(row.label), row])), [rows])
  const knownStateLabels = useMemo(() => new Set(states.map((state) => normalizeStateLabel(state.label))), [states])
  const mapGeography = useMemo(() => buildStateGeoCollection(indiaGeo as GeoCollection, knownStateLabels), [knownStateLabels])
  const markerRows = useMemo(
    () =>
      Object.entries(TINY_REGION_MARKERS)
        .map(([name, coordinates]) => ({
          name,
          coordinates,
          row: rowByState.get(normalizeStateLabel(name)),
        }))
        .filter((item) => knownStateLabels.has(normalizeStateLabel(item.name))),
    [knownStateLabels, rowByState],
  )

  function handleMouseEnter(event: MouseEvent<SVGPathElement>, name: string, count: number, row: MapRow | undefined) {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top
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
    <div ref={containerRef} className="relative rounded-[24px] border border-jscolors-crimson/10 bg-[#FBF7F6] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 980, center: [82.8, 23.5] }} style={{ width: "100%", height: "540px", background: "#F7EFEE" }}>
        <Geographies geography={mapGeography}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, unknown> }> }) =>
            geographies.map((geography: { rsmKey: string; properties: Record<string, unknown> }) => {
              const name = String(geography.properties?.st_nm ?? geography.properties?.name ?? "")
              const row = rowByState.get(normalizeStateLabel(name))
              const count = row?.count ?? 0
              return (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  stroke={count > 0 ? "#FFF6F4" : "#BDAAAA"}
                  strokeWidth={count > 0 ? 1 : 1.2}
                  fill={count > 0 ? "#8B1A1A" : "#D9C7C7"}
                  onMouseEnter={(event: MouseEvent<SVGPathElement>) => handleMouseEnter(event, name, count, row)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: count > 0 ? "#6F1515" : "#CBB3B3" },
                    pressed: { outline: "none" },
                  }}
                />
              )
            })
          }
        </Geographies>
        {markerRows.map((marker) => (
          <Marker key={marker.name} coordinates={marker.coordinates}>
            <g
              onMouseEnter={(event) => {
                const target = event.target as SVGCircleElement
                const rect = target.getBoundingClientRect()
                handleMouseEnter(
                  {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                  } as MouseEvent<SVGPathElement>,
                  marker.name,
                  marker.row?.count ?? 0,
                  marker.row,
                )
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}
            >
              <circle r={6} fill={marker.row?.count ? "#8B1A1A" : "#CDB8B8"} stroke="#ffffff" strokeWidth={2} />
            </g>
          </Marker>
        ))}
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

function buildStateGeoCollection(source: GeoCollection, allowedStates: Set<string>): GeoCollection {
  const grouped = new Map<string, number[][][][]>()

  for (const feature of source.features) {
    const stateName = String(feature.properties?.st_nm ?? feature.properties?.name ?? "").trim()
    const normalized = normalizeStateLabel(stateName)
    if (!normalized || (allowedStates.size && !allowedStates.has(normalized))) continue

    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

    const current = grouped.get(stateName) ?? []
    current.push(...polygons)
    grouped.set(stateName, current)
  }

  const features = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stateName, coordinates]) => ({
      type: "Feature" as const,
      properties: { name: stateName, st_nm: stateName },
      geometry: {
        type: "MultiPolygon" as const,
        coordinates,
      },
    }))

  return { type: "FeatureCollection", features }
}

function normalizeStateLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}
