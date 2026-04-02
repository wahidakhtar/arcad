import { useEffect, useState } from "react"

import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { subscribe } from "../../hooks/useWebSocket"
import { useListPage } from "../../hooks/useListPage"
import FieldRenderer from "../../components/ui/FieldRenderer"
import { poCircuitContext, poProjectName } from "./poHelpers"
import type { Invoice, PO } from "./types"

type BillingTab = "pos" | "invoices"

export default function PoListPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>("pos")
  const { data: poData, loading: poLoading, error: poError, refetch } = useListPage<PO[]>({
    endpoint: "/billing/pos",
  })
  const { data: invoiceData, loading: invoiceLoading, error: invoiceError, refetch: refetchInvoices } = useListPage<Invoice[]>({
    endpoint: "/billing/invoices",
  })

  useEffect(() => {
    const unsub1 = subscribe("PO_CREATED", () => { void refetch() })
    const unsub2 = subscribe("PO_UPDATED", () => { void refetch() })
    const unsub3 = subscribe("INVOICE_UPDATED", () => { void Promise.all([refetch(), refetchInvoices()]) })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [refetch, refetchInvoices])

  const poRows = [...(poData ?? [])].sort((a, b) => b.id - a.id)
  const poTableRows = poRows.map((row) => ({
    ...row,
    project_name: poProjectName(row),
    circuit_context: poCircuitContext(row),
  }))
  const invoiceRows = [...(invoiceData ?? [])].sort((a, b) => b.id - a.id)

  function renderActiveTable() {
    if (activeTab === "pos") {
      if (poLoading) {
        return <div className="p-6 text-jscolors-text/50">Loading purchase orders...</div>
      }
      if (poError) {
        return <div className="p-6 text-red-600">{poError}</div>
      }
      return (
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
          rows={poTableRows}
          rowHref={(row) => `/billing/po/${row.id}`}
        />
      )
    }

    if (invoiceLoading) {
      return <div className="p-6 text-jscolors-text/50">Loading invoices...</div>
    }
    if (invoiceError) {
      return <div className="p-6 text-red-600">{invoiceError}</div>
    }
    return (
      <DataTable
        columns={[
          { key: "po_id", label: "PO ID", minWidth: 110 },
          { key: "invoice_no", label: "Invoice Number", minWidth: 200 },
          { key: "invoice_date", label: "Invoice Date", type: "date", minWidth: 140 },
          { key: "submission_date", label: "Submission Date", type: "date", minWidth: 150 },
          { key: "settlement_date", label: "Settlement Date", type: "date", minWidth: 150 },
          { key: "invoice_status", label: "Status", type: "badge", minWidth: 160 },
        ]}
        rows={invoiceRows}
        rowHref={(row) => `/billing/po/${row.po_id}`}
      />
    )
  }

  return (
    <ListPageLayout
      filters={
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-jscolors-crimson/12 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "pos"
                  ? "bg-jscolors-crimson text-white"
                  : "text-jscolors-text/65 hover:bg-jscolors-gold/12"
              }`}
            >
              POs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "invoices"
                  ? "bg-jscolors-crimson text-white"
                  : "text-jscolors-text/65 hover:bg-jscolors-gold/12"
              }`}
            >
              Invoices
            </button>
          </div>
          <FilterBar filters={[]} onFilterChange={() => {}} />
        </div>
      }
    >
      {renderActiveTable()}
    </ListPageLayout>
  )
}
