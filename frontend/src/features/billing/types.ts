export type BillingBadge = {
  id: number
  label: string
  color: string | null
}

export type PO = {
  id: number
  project_id: number
  project_label: string | null
  site_id: number | null
  subproject_id: number | null
  entity_id: string | null
  po_no: string | null
  po_date: string | null
  period_from: string | null
  period_to: string | null
  valid_from: string | null
  valid_to: string | null
  po_status_id: number
  po_status: BillingBadge
  invoice_status?: BillingBadge | null
  version: number
}

export type Invoice = {
  id: number
  po_id: number
  invoice_no: string | null
  period_from: string | null
  period_to: string | null
  submission_date: string | null
  settlement_date: string | null
  invoice_status_id: number
  invoice_status: BillingBadge
  amount: string | number | null
  version: number
}
