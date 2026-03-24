import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import DataTable from "../../../components/ui/DataTable"
import FieldRenderer from "../../../components/ui/FieldRenderer"
import { api } from "../../../lib/api"
import type { Invoice, PO } from "../types"

type DetailFieldProps = {
  label: string
  value: React.ReactNode
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="rounded-[22px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{label}</div>
      <div className="mt-3 text-sm text-jscolors-text">{value}</div>
    </div>
  )
}

export default function PoDetailPage() {
  const { poId = "0" } = useParams()
  const [po, setPo] = useState<PO | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      setLoading(true)
      setError("")
      try {
        const [poResponse, invoicesResponse] = await Promise.all([
          api.get<PO>(`/billing/po/${poId}`),
          api.get<Invoice[]>("/billing/invoices", { params: { po_id: Number(poId) } }),
        ])
        if (cancelled) return
        setPo(poResponse.data)
        setInvoices(invoicesResponse.data)
      } catch (requestError) {
        if (cancelled) return
        const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail
        setError(detail ?? "Unable to load PO details.")
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    void loadPage()
    return () => {
      cancelled = true
    }
  }, [poId])

  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => b.id - a.id), [invoices])

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading PO details...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!po) return <div className="p-6 text-jscolors-text/50">PO not found.</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-4">
        <div className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">Status</div>
          <div className="mt-2">
            <FieldRenderer type="badge" value={po.po_status} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Purchase Order</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-syne text-3xl font-semibold text-jscolors-crimson">{po.po_no || `PO #${po.id}`}</h1>
              <p className="mt-2 text-sm text-jscolors-text/60">
                PO Date: <span className="text-jscolors-text">{po.po_date || "-"}</span>
              </p>
              <p className="mt-1 text-sm text-jscolors-text/60">
                Project: <span className="text-jscolors-text">{po.project_label || "-"}</span>
              </p>
            </div>
            <div className="shrink-0">
              <FieldRenderer type="badge" value={po.po_status} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">PO Information</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailField label="PO Number" value={<FieldRenderer value={po.po_no} />} />
              <DetailField label="PO Date" value={<FieldRenderer value={po.po_date} />} />
              <DetailField label="Project" value={<FieldRenderer value={po.project_label} />} />
              <DetailField label="Status" value={<FieldRenderer type="badge" value={po.po_status} />} />
            </div>
          </section>

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
                rows={sortedInvoices}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
