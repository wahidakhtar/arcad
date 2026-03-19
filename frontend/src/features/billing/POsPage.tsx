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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Billing</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">PO register</h1>
      </div>
      <FilterBar filters={[]} onFilterChange={() => {}} />
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
  )
}
