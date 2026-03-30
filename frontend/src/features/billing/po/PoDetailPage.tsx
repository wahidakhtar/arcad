import DetailPageLayout from "../../../components/layout/DetailPageLayout"
import FieldRenderer from "../../../components/ui/FieldRenderer"
import InvoiceTable from "./components/InvoiceTable"
import PoHeader from "./components/PoHeader"
import PoInfoSection from "./components/PoInfoSection"
import PoUpdatesSection from "./components/PoUpdatesSection"
import usePoDetail from "./hooks/usePoDetail"

export default function PoDetailPage() {
  const { po, invoices, loading, error, loadPage } = usePoDetail()

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading PO details...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!po) return <div className="p-6 text-jscolors-text/50">PO not found.</div>

  return (
    <DetailPageLayout
      backHref="/billing/po"
      badges={
        <div className="flex flex-wrap gap-2">
          <div className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">PO Status</div>
            <div className="mt-2">
              <FieldRenderer type="badge" value={po.po_status} />
            </div>
          </div>
          {po.invoice_status && po.site_status_key === "comp" ? (
            <div className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">Invoice Status</div>
              <div className="mt-2">
                <FieldRenderer type="badge" value={po.invoice_status} />
              </div>
            </div>
          ) : null}
        </div>
      }
      title={<PoHeader po={po} />}
    >
      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <PoInfoSection po={po} onSaved={loadPage} />
        <InvoiceTable invoices={invoices} />
      </div>
      <PoUpdatesSection poId={po.id} />
    </DetailPageLayout>
  )
}
