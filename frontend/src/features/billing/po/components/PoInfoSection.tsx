import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import { poProjectName } from "../../poHelpers"
import type { PO } from "../../types"

export default function PoInfoSection({ po }: { po: PO }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">PO Information</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailFieldCard label="PO Number" value={<FieldRenderer value={po.po_no} />} />
        <DetailFieldCard label="PO Date" value={<FieldRenderer value={po.po_date} />} />
        <DetailFieldCard label="Project" value={<FieldRenderer value={poProjectName(po)} />} />
        <DetailFieldCard label="Status" value={<FieldRenderer type="badge" value={po.po_status} />} />
      </div>
    </section>
  )
}
