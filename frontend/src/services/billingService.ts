import { api } from "../lib/api"
import type { Invoice, PO } from "../features/billing/types"

export const getPoById = (id: number) =>
  api.get<PO>(`/billing/po/${id}`)

export const getInvoicesByPoId = (poId: number) =>
  api.get<Invoice[]>("/billing/invoices", { params: { po_id: poId } })

export const updatePo = (id: number, data: { po_no?: string | null; po_date?: string | null }) =>
  api.patch<PO>(`/billing/pos/${id}`, data)

export const updateInvoice = (id: number, data: { invoice_no?: string | null; invoice_date?: string | null; submission_date?: string | null; settlement_date?: string | null }) =>
  api.patch(`/billing/invoices/${id}`, data)

export const rejectInvoice = (id: number) =>
  api.post(`/billing/invoices/${id}/reject`)
