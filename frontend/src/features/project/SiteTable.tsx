import BadgeSelectCell from "./components/BadgeSelectCell"

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
          {siteList.map(site => (
            <tr key={site.id}>
              {COLUMN_ORDER.map(col => {

                if (col === "status_label") {
                  return (
                    <td key={col}>
                      <BadgeSelectCell
                        site={site}
                        field="status_badge_id"
                        type="status"
                        reload={reload}
                      />
                    </td>
                  )
                }

                if (col === "wcc_status") {
                  return (
                    <td key={col}>
                      <BadgeSelectCell
                        site={site}
                        field="wcc_badge_id"
                        type="doc"
                        entityTypeId={5}
                        reload={reload}
                      />
                    </td>
                  )
                }

                if (col === "po_status") {
                  return (
                    <td key={col}>
                      <BadgeSelectCell
                        site={site}
                        field="po_status_badge_id"
                        type="doc"
                        entityTypeId={4}
                        reload={reload}
                      />
                    </td>
                  )
                }

                if (col === "invoice_status") {
                  return (
                    <td key={col}>
                      <BadgeSelectCell
                        site={site}
                        field="invoice_status_badge_id"
                        type="doc"
                        entityTypeId={3}
                        reload={reload}
                      />
                    </td>
                  )
                }

                return (
                  <td
                    key={col}
                    onClick={() => onSelect(site)}
                    style={{ cursor: "pointer" }}
                  >
                    {String(site[col] ?? "")}
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
