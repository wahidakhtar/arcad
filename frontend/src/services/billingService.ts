import { api } from "../lib/api"
import type { Invoice, PO } from "../features/billing/types"

export const getPoById = (id: number) =>
  api.get<PO>(`/billing/po/${id}`)

export const getInvoicesByPoId = (poId: number) =>
  api.get<Invoice[]>("/billing/invoices", { params: { po_id: poId } })
