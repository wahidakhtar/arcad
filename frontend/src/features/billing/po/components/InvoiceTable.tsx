import DataTable from "../../../../components/ui/DataTable"
import type { Invoice } from "../../types"

export default function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Invoices</p>
      <div className="mt-5">
        <DataTable
          columns={[
            { key: "invoice_no", label: "Invoice Number", minWidth: 200 },
            { key: "submission_date", label: "Date", minWidth: 150 },
            { key: "amount", label: "Amount", minWidth: 140 },
            { key: "invoice_status", label: "Status", type: "badge", minWidth: 180 },
          ]}
          rows={invoices}
        />
      </div>
    </section>
  )
}
