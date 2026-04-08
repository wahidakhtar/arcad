import { useEffect, useState } from "react"

import Button from "../../components/ui/Button"
import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { subscribe } from "../../hooks/useWebSocket"
import { useListPage } from "../../hooks/useListPage"
import FieldRenderer from "../../components/ui/FieldRenderer"
import { api } from "../../lib/api"
import { poCircuitContext, poProjectName } from "./poHelpers"
import type { Invoice, PO } from "./types"
import { exportToExcel } from "../../utils/exportToExcel"

type BillingTab = "pos" | "invoices"

export default function PoListPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>("pos")
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceReloadToken, setInvoiceReloadToken] = useState(0)
  const { data: poData, loading: poLoading, error: poError, refetch } = useListPage<PO[]>({
    endpoint: "/billing/pos",
  })

  useEffect(() => {
    const unsub1 = subscribe("PO_CREATED", () => { void refetch() })
    const unsub2 = subscribe("PO_UPDATED", () => { void refetch() })
    const unsub3 = subscribe("INVOICE_UPDATED", () => {
      void refetch()
      setInvoiceReloadToken((current) => current + 1)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [refetch])

  useEffect(() => {
    if (activeTab !== "invoices") return
    let cancelled = false
    setInvoiceLoading(true)
    setInvoiceError("")

    void api
      .get<Invoice[]>("/billing/invoices")
      .then((response) => {
        if (cancelled) return
        setInvoiceData(Array.isArray(response.data) ? response.data : [])
      })
      .catch((requestError: { response?: { data?: { detail?: string } } }) => {
        if (cancelled) return
        setInvoiceError(requestError.response?.data?.detail ?? "Unable to load invoices.")
      })
      .finally(() => {
        if (cancelled) return
        setInvoiceLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, invoiceReloadToken])

  const poRows = poData ?? []
  const poTableRows = poRows.map((row) => ({
    ...row,
    project_name: poProjectName(row),
    circuit_context: poCircuitContext(row),
  }))
  const invoiceRows = invoiceData

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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={activeTab === "pos" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("pos")}>POs</Button>
          <Button variant={activeTab === "invoices" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("invoices")}>Invoices</Button>
          <FilterBar filters={[]} onFilterChange={() => {}} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTab === "pos") {
                void exportToExcel("purchase_orders", "POs", [
                  { key: "project_name", label: "Project" },
                  { key: "circuit_context", label: "Circuit ID" },
                  { key: "po_no", label: "PO Number" },
                  { key: "po_status", label: "PO Status" },
                  { key: "invoice_status", label: "Invoice Status" },
                ], poTableRows as unknown as Record<string, unknown>[])
              } else {
                void exportToExcel("invoices", "Invoices", [
                  { key: "po_id", label: "PO ID" },
                  { key: "invoice_no", label: "Invoice Number" },
                  { key: "invoice_date", label: "Invoice Date" },
                  { key: "submission_date", label: "Submission Date" },
                  { key: "settlement_date", label: "Settlement Date" },
                  { key: "invoice_status", label: "Status" },
                ], invoiceRows as unknown as Record<string, unknown>[])
              }
            }}
          >
            Export
          </Button>
        </div>
      }
    >
      {renderActiveTable()}
    </ListPageLayout>
  )
}
