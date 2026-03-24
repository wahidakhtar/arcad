import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import { useListPage } from "../../hooks/useListPage"
import FieldRenderer from "../../components/ui/FieldRenderer"
import type { PO } from "./types"

export default function POsPage() {
  const { data, loading, error } = useListPage<PO[]>({
    endpoint: "/billing/pos",
  })

  const rows = [...(data ?? [])].sort((a, b) => b.id - a.id)

  if (loading) {
    return <div className="p-6 text-jscolors-text/50">Loading purchase orders...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <FilterBar filters={[]} onFilterChange={() => {}} />
      <DataTable
        columns={[
          { key: "po_no", label: "PO Number", minWidth: 220 },
          { key: "po_status", label: "PO Status", type: "badge", minWidth: 180 },
          {
            key: "invoice_status",
            label: "Invoice Status",
            minWidth: 180,
            render: (value) => value ? <FieldRenderer type="badge" value={value} /> : "-",
          },
        ]}
        rows={rows}
        rowHref={(row) => `/billing/po/${row.id}`}
      />
    </div>
  )
}
