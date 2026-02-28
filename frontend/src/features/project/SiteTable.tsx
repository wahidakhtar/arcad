import { useState } from "react"
import { api } from "../../lib/api"
import { useDocStateBadges } from "./hooks/useDocStateBadges"

const COLUMN_ORDER = [
  "receiving_date",
  "permission_date",
  "edd",
  "status_label",
  "ckt_id",
  "customer",
  "height_m",
  "city",
  "budget",
  "paid",
  "balance",
  "completion_date",
  "wcc_status",
  "po_status",
  "invoice_status",
]

function formatHeader(key: string) {
  const overrides: Record<string, string> = {
    height_m: "Height (mtr)",
    ckt_id: "CKT ID",
    edd: "EDD",
    status_label: "Status",
    wcc_status: "WCC",
    po_status: "PO Status",
    invoice_status: "Invoice Status",
  }

  if (overrides[key]) return overrides[key]
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export default function SiteTable({
  siteList,
  onSelect,
  reload,
}: {
  siteList: any[]
  onSelect: (site: any) => void
  reload: () => void
}) {

  const [transitionMap, setTransitionMap] = useState<Record<number, any[]>>({})
  const docBadges = useDocStateBadges()

  const loadTransitions = async (site: any) => {
    const res = await api.get("/v1/badge/status", {
      params: {
        project_id: site.project_id,
        current_status_id: site.status_badge_id,
      },
    })

    setTransitionMap(prev => ({
      ...prev,
      [site.id]: res.data
    }))
  }

  const handleStatusUpdate = async (siteId: number, badgeId: number) => {
    await api.put(`/v1/mi/site/${siteId}`, {
      status_badge_id: badgeId
    })
    reload()
  }

  const handleDocUpdate = async (siteId: number, field: string, badgeId: number) => {
    await api.put(`/v1/mi/site/${siteId}`, {
      [field]: badgeId
    })
    reload()
  }

  return (
    <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {COLUMN_ORDER.map(col => (
              <th key={col}>{formatHeader(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {siteList.map(s => (
            <tr key={s.id}>
              {COLUMN_ORDER.map(col => {

                if (col === "status_label") {
                  const transitions = transitionMap[s.id] || []

                  return (
                    <td key={col}>
                      <select
                        value={s.status_badge_id || ""}
                        onFocus={() => loadTransitions(s)}
                        onChange={e =>
                          handleStatusUpdate(s.id, Number(e.target.value))
                        }
                        style={{
                          background: s.status_color || "#ccc",
                          padding: "4px"
                        }}
                      >
                        <option value={s.status_badge_id}>
                          {s.status_label}
                        </option>
                        {transitions.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }

                if (col === "wcc_status") {
                  return (
                    <td key={col}>
                      <select
                        value={s.wcc_badge_id || ""}
                        onChange={e =>
                          handleDocUpdate(s.id, "wcc", Number(e.target.value))
                        }
                      >
                        {docBadges.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }

                if (col === "po_status") {
                  return (
                    <td key={col}>
                      <select
                        value={s.po_status_badge_id || ""}
                        onChange={e =>
                          handleDocUpdate(s.id, "po_status_badge_id", Number(e.target.value))
                        }
                      >
                        {docBadges.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }

                if (col === "invoice_status") {
                  return (
                    <td key={col}>
                      <select
                        value={s.invoice_status_badge_id || ""}
                        onChange={e =>
                          handleDocUpdate(s.id, "invoice_status_badge_id", Number(e.target.value))
                        }
                      >
                        {docBadges.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }

                return (
                  <td
                    key={col}
                    onClick={() => onSelect(s)}
                    style={{ cursor: "pointer" }}
                  >
                    {String(s[col] ?? "")}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
