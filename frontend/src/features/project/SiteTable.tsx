import { useStatusBadges } from "./hooks/useStatusBadges"
import { useDocStateBadges } from "./hooks/useDocStateBadges"
import { api } from "../../lib/api"

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
  const statusBadges = useStatusBadges()
  const docBadges = useDocStateBadges()

  const handleUpdate = async (siteId: number, field: string, badgeId: number) => {
    await api.put(`/v1/mi/site/${siteId}`, { [field]: badgeId })
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
                  const current = statusBadges.find(b => b.description === s.status_label)
                  return (
                    <td key={col}>
                      <select
                        value={current?.id || ""}
                        onChange={e =>
                          handleUpdate(s.id, "status_badge_id", Number(e.target.value))
                        }
                        style={{
                          background: s.status_color || "#ccc",
                          padding: "4px"
                        }}
                      >
                        {statusBadges.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }

                if (["wcc_status", "po_status", "invoice_status"].includes(col)) {
                  const fieldMap: Record<string, string> = {
                    wcc_status: "wcc",
                    po_status: "po_status_badge_id",
                    invoice_status: "invoice_status_badge_id",
                  }

                  const current = docBadges.find(b => b.description === s[col])

                  return (
                    <td key={col}>
                      <select
                        value={current?.id || ""}
                        onChange={e =>
                          handleUpdate(s.id, fieldMap[col], Number(e.target.value))
                        }
                        style={{
                          background: current?.color || "#fff",
                          padding: "4px"
                        }}
                      >
                        <option value="" disabled>--</option>
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
