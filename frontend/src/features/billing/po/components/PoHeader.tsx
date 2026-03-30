import { poProjectName } from "../../poHelpers"
import type { PO } from "../../types"

export default function PoHeader({ po }: { po: PO }) {
  return (
    <div>
      <h1 className="font-syne text-3xl font-semibold text-jscolors-crimson">{poProjectName(po)}</h1>
      {po.po_no ? (
        <p className="mt-2 text-sm text-jscolors-text/60">
          <span className="text-jscolors-text">{po.po_no}</span>
        </p>
      ) : null}
    </div>
  )
}
