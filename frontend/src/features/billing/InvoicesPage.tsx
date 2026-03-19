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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Billing</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Invoice register</h1>
      </div>
      <FilterBar filters={[]} onFilterChange={() => {}} />
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
  )
}
