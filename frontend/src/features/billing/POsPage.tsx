import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import { useListPage } from "../../hooks/useListPage"

export default function POsPage() {
  const { data, loading, error } = useListPage<Array<Record<string, unknown>>>({
    endpoint: "/billing/pos",
  })

  if (loading) {
    return <div className="glass-panel p-6">Loading purchase orders...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <FilterBar filters={[]} onFilterChange={() => {}} />
      <div className="glass-panel overflow-x-auto border-0 bg-transparent backdrop-blur-none">
        <DataTable
          columns={[
            { key: "project_id", label: "Project" },
            { key: "entity_id", label: "Entity ID" },
            { key: "po_no", label: "PO Number" },
            { key: "po_date", label: "PO Date" },
            { key: "po_status_id", label: "Status" },
          ]}
          rows={data ?? []}
        />
      </div>
    </div>
  )
}
