import FieldRenderer from "../../../../components/ui/FieldRenderer"
import type { PO } from "../../types"

export default function PoHeader({ po }: { po: PO }) {
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Purchase Order</div>
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
    </>
  )
}
