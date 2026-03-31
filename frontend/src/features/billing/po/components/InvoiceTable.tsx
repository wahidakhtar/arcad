import { useState } from "react"

import DataTable from "../../../../components/ui/DataTable"
import Modal from "../../../../components/ui/Modal"
import { updateInvoice } from "../../../../services/billingService"
import type { Invoice } from "../../types"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

export default function InvoiceTable({ invoices, onSaved }: { invoices: Invoice[]; onSaved: () => Promise<void> }) {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [draftNo, setDraftNo] = useState("")
  const [draftDate, setDraftDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openEdit(invoice: Invoice) {
    setDraftNo(invoice.invoice_no ?? "")
    setDraftDate(invoice.submission_date ?? "")
    setError("")
    setEditingInvoice(invoice)
  }

  async function save() {
    if (!editingInvoice) return
    if (!draftNo.trim() || !draftDate) {
      setError("Invoice Number and Date are both required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await updateInvoice(editingInvoice.id, { invoice_no: draftNo, submission_date: draftDate })
      setEditingInvoice(null)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Failed to update invoice.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Invoices</p>
      <div className="mt-5">
        <DataTable
          columns={[
            { key: "invoice_no", label: "Invoice Number", minWidth: 180 },
            { key: "submission_date", label: "Date", minWidth: 130, type: "date" },
            { key: "amount", label: "Amount", minWidth: 120 },
            { key: "invoice_status", label: "Status", type: "badge", minWidth: 160 },
            {
              key: "_edit",
              label: "",
              minWidth: 80,
              render: (_: unknown, row: Record<string, unknown>) => (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); openEdit(row as unknown as Invoice) }}
                  className="text-xs font-medium text-jscolors-crimson hover:underline"
                >
                  Edit
                </button>
              ),
            },
          ]}
          rows={invoices as unknown as Record<string, unknown>[]}
          emptyState={<span className="text-sm text-jscolors-text/40">No invoices yet.</span>}
        />
      </div>

      <Modal
        isOpen={editingInvoice !== null}
        title="Edit Invoice Details"
        onClose={() => { setEditingInvoice(null); setError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void save()}
        isSubmitting={saving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Invoice Number *</span>
            <input
              type="text"
              value={draftNo}
              onChange={(e) => setDraftNo(sanitizeDocNo(e.target.value))}
              className={fieldCls}
              placeholder="e.g. INV/2026/001"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Submission Date *</span>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className={fieldCls}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
