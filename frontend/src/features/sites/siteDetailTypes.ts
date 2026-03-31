export type SiteDetail = {
  id: number
  ckt_id: string
  project_key: string
  subproject_id: number
  receiving_date: string
  status_key: string
  fields: Record<string, unknown>
  financials: { budget: string; cost: string; paid: string; balance: string }
  subcon_rows: Array<{ assignment_id: number; subcon_id: number; subcon_label: string; bucket_key: string; active: boolean; cost: string; paid: string; balance: string }>
}

export type OutcomeOption = {
  value: number
  label: string
}

export type UIField = {
  key: string
  label: string
  tag?: string
  id?: number
  list_view?: boolean
  type?: string
  options?: Array<{ label: string; value: string | number }>
}

export type Badge = {
  id: number
  key: string
  label: string
  color: string | null
  type: string
}

export type TransitionRow = {
  transition_type: string
  field_key: string
  from_id: number
  from_key: string
  from_label: string
  to_id: number
  to_key: string
  to_label: string
}

export type StateRow = {
  id: number
  label: string
}

export type ProjectRow = {
  id: number
  key: string
  label: string
}

export type JobBucket = {
  id: number
  key: string
  label: string
}

export type SubconRow = {
  id: number
  label: string
}

export type UpdateRow = {
  id: number
  date: string
  update: string
  followup_date?: string | null
  dept_id?: number
}

export type TicketRow = {
  id: number
  project_id: number
  site_id: number
  ticket_date: string
  closing_date?: string | null
}

export type TransactionRow = {
  id: number
  project_id: number
  site_id?: number | null
  request_date: string
  recipient_id?: number | null
  bucket_key?: string | null
  type_id: number
  amount: string
  status_id: number
  remarks?: string | null
  version: number
}

export type RechargeRow = {
  id: number
  site_id: number
  date: string
  amount: string
  validity: number
  uom: string
  next_recharge_date?: string | null
}
