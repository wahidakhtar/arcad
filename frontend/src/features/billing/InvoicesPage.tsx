import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import { useListPage } from "../../hooks/useListPage"

export default function InvoicesPage() {
  const { data, loading, error } = useListPage<Array<Record<string, unknown>>>({
    endpoint: "/billing/invoices",
  })

  if (loading) {
    return <div className="glass-panel p-6">Loading invoices...</div>
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
            { key: "po_id", label: "PO ID" },
            { key: "invoice_no", label: "Invoice Number" },
            { key: "submission_date", label: "Submission Date" },
            { key: "settlement_date", label: "Settlement Date" },
            { key: "invoice_status_id", label: "Status" },
          ]}
          rows={data ?? []}
        />
      </div>
    </div>
  )
}
