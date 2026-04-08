import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { useListPage } from "../../hooks/useListPage"
import FieldRenderer from "../../components/ui/FieldRenderer"
import { poCircuitContext, poProjectName } from "./poHelpers"
import type { PO } from "./types"

export default function POsPage() {
  const { data, loading, error } = useListPage<PO[]>({
    endpoint: "/billing/pos",
  })

  const rows = data ?? []
  const tableRows = rows.map((row) => ({
    ...row,
    project_name: poProjectName(row),
    circuit_context: poCircuitContext(row),
  }))

  if (loading) {
    return <div className="p-6 text-jscolors-text/50">Loading purchase orders...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout filters={<FilterBar filters={[]} onFilterChange={() => {}} />}>
      <DataTable
        columns={[
          { key: "project_name", label: "Project", minWidth: 180 },
          { key: "circuit_context", label: "Circuit ID", minWidth: 180 },
          { key: "po_no", label: "PO Number", minWidth: 220 },
          { key: "po_status", label: "PO Status", type: "badge", minWidth: 180 },
          {
            key: "invoice_status",
            label: "Invoice Status",
            minWidth: 180,
            render: (value) => value ? <FieldRenderer type="badge" value={value} /> : "-",
          },
        ]}
        rows={tableRows}
        rowHref={(row) => `/billing/po/${row.id}`}
      />
    </ListPageLayout>
  )
}
