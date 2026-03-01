import { columnConfig } from "./table/columnConfig"
import StatusBadgeSelectCell from "./components/StatusBadgeSelectCell"
import DocBadgeSelectCell from "./components/DocBadgeSelectCell"

function formatHeader(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export default function SiteTable({
  siteList,
  reload,
  capabilities,
}: {
  siteList: any[]
  reload: () => void
  capabilities: any
}) {

  const columns = columnConfig.filter(col => {
    if (col.group === "finance" && !capabilities.view_finance) return false
    return true
  })

  return (
    <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{formatHeader(col.key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {siteList.map(site => (
            <tr key={site.id}>
              {columns.map(col => {

                if (col.key === "status_label") {
                  return (
                    <td key={col.key}>
                      <StatusBadgeSelectCell
                        site={site}
                        reload={reload}
                        capabilities={capabilities}
                      />
                    </td>
                  )
                }

                if (col.key === "wcc_status") {
                  return (
                    <td key={col.key}>
                      <DocBadgeSelectCell
                        site={site}
                        field="wcc_badge_id"
                        entityTypeId={5}
                        reload={reload}
                        canToggle={capabilities.toggle_wcc}
                      />
                    </td>
                  )
                }

                if (col.key === "po_status") {
                  return (
                    <td key={col.key}>
                      <DocBadgeSelectCell
                        site={site}
                        field="po_status_badge_id"
                        entityTypeId={4}
                        reload={reload}
                        canToggle={capabilities.toggle_po}
                      />
                    </td>
                  )
                }

                if (col.key === "invoice_status") {
                  return (
                    <td key={col.key}>
                      <DocBadgeSelectCell
                        site={site}
                        field="invoice_status_badge_id"
                        entityTypeId={3}
                        reload={reload}
                        canToggle={capabilities.toggle_invoice}
                      />
                    </td>
                  )
                }

                return (
                  <td key={col.key}>
                    {String(site[col.key] ?? "")}
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
