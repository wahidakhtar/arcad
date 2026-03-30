import type { PO } from "./types"

export function poProjectName(po: PO) {
  return po.project_name ?? po.project_label ?? "-"
}

export function poCircuitContext(po: PO) {
  return po.site_id ? (po.site_circuit_id ?? "-") : (po.subproject_name ?? "-")
}
