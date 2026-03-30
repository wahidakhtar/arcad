import { api } from "../lib/api"
import type { Invoice, PO } from "../features/billing/types"

export const getPoById = (id: number) =>
  api.get<PO>(`/billing/po/${id}`)

export const getInvoicesByPoId = (poId: number) =>
  api.get<Invoice[]>("/billing/invoices", { params: { po_id: poId } })

export const updatePo = (id: number, data: { po_no?: string | null; po_date?: string | null }) =>
  api.patch<PO>(`/billing/pos/${id}`, data)
