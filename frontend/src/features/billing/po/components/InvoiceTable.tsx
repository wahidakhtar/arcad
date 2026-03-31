import { useState } from "react"

import Button from "../../../../components/ui/Button"
import DataTable from "../../../../components/ui/DataTable"
import Modal from "../../../../components/ui/Modal"
import { rejectInvoice, updateInvoice } from "../../../../services/billingService"
import type { Invoice } from "../../types"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

type Tab = "details" | "submission" | "settlement"

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

export default function InvoiceTable({ invoices, isBB, onSaved }: { invoices: Invoice[]; isBB: boolean; onSaved: () => Promise<void> }) {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [draftNo, setDraftNo] = useState("")
  const [draftInvDate, setDraftInvDate] = useState("")
  const [draftPeriodFrom, setDraftPeriodFrom] = useState("")
  const [draftPeriodTo, setDraftPeriodTo] = useState("")
  const [draftSubmissionDate, setDraftSubmissionDate] = useState("")
  const [draftSettlementDate, setDraftSettlementDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  function openEdit(invoice: Invoice) {
    setDraftNo(invoice.invoice_no ?? "")
    setDraftInvDate(invoice.invoice_date ?? "")
    setDraftPeriodFrom(invoice.period_from ?? "")
    setDraftPeriodTo(invoice.period_to ?? "")
    setDraftSubmissionDate(invoice.submission_date ?? "")
    setDraftSettlementDate(invoice.settlement_date ?? "")
    setActiveTab("details")
    setError("")
    setEditingInvoice(invoice)
  }

  async function save() {
    if (!editingInvoice) return
    if (!draftNo.trim() || !draftInvDate || (isBB && (!draftPeriodFrom || !draftPeriodTo))) {
      setActiveTab("details")
      setError(isBB ? "Invoice Number, Invoice Date, Period From, and Period To are all required." : "Invoice Number and Invoice Date are both required.")
      return
    }
    if (draftSubmissionDate && draftInvDate > draftSubmissionDate) {
      setActiveTab("submission")
      setError("Invoice date must be on or before submission date.")
      return
    }
    if (draftSettlementDate && draftSubmissionDate && draftSubmissionDate > draftSettlementDate) {
      setActiveTab("settlement")
      setError("Submission date must be on or before settlement date.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await updateInvoice(editingInvoice.id, {
        invoice_no: draftNo,
        invoice_date: draftInvDate,
        period_from: isBB ? draftPeriodFrom : null,
        period_to: isBB ? draftPeriodTo : null,
        submission_date: draftSubmissionDate || null,
        settlement_date: draftSettlementDate || null,
      })
      setEditingInvoice(null)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Failed to update invoice.")
    } finally {
      setSaving(false)
    }
  }

  async function reject(invoice: Invoice, e: React.MouseEvent) {
    e.stopPropagation()
    setRejectingId(invoice.id)
    try {
      await rejectInvoice(invoice.id)
      await onSaved()
    } finally {
      setRejectingId(null)
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Invoices</p>
      <div className="mt-5">
        <DataTable
          columns={[
            { key: "invoice_no", label: "Invoice Number", minWidth: 180 },
            { key: "invoice_date", label: "Invoice Date", minWidth: 130, type: "date" },
            ...(isBB ? [
              { key: "period_from", label: "Period From", minWidth: 130, type: "date" },
              { key: "period_to", label: "Period To", minWidth: 130, type: "date" },
            ] : []),
            { key: "submission_date", label: "Submission Date", minWidth: 130, type: "date" },
            { key: "settlement_date", label: "Settlement Date", minWidth: 130, type: "date" },
            { key: "invoice_status", label: "Status", type: "badge", minWidth: 160 },
            {
              key: "_reject",
              label: "",
              minWidth: 80,
              render: (_: unknown, row: Record<string, unknown>) => {
                const invoice = row as unknown as Invoice
                const isRaised = invoice.invoice_status?.label?.toLowerCase() === "raised"
                if (!isRaised) return null
                return (
                  <button
                    type="button"
                    onClick={(e) => void reject(invoice, e)}
                    disabled={rejectingId === invoice.id}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    {rejectingId === invoice.id ? "..." : "Rejected"}
                  </button>
                )
              },
            },
          ]}
          rows={invoices as unknown as Record<string, unknown>[]}
          onRowClick={(row) => openEdit(row as unknown as Invoice)}
          emptyState={<span className="text-sm text-jscolors-text/40">No invoices yet.</span>}
        />
      </div>

      <Modal
        isOpen={editingInvoice !== null}
        title="Invoice Details"
        onClose={() => { setEditingInvoice(null); setError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void save()}
        isSubmitting={saving}
      >
        <div className="space-y-4">
          {(() => {
            const canSubmission = !!(editingInvoice?.invoice_no && editingInvoice?.invoice_date)
            const canSettlement = !!editingInvoice?.submission_date
            return (
              <div className="flex gap-2">
                <Button size="sm" variant={activeTab === "details" ? "primary" : "secondary"} onClick={() => setActiveTab("details")}>Details</Button>
                <Button size="sm" variant={activeTab === "submission" ? "primary" : canSubmission ? "secondary" : "ghost"} disabled={!canSubmission} onClick={() => canSubmission && setActiveTab("submission")}>Submission</Button>
                <Button size="sm" variant={activeTab === "settlement" ? "primary" : canSettlement ? "secondary" : "ghost"} disabled={!canSettlement} onClick={() => canSettlement && setActiveTab("settlement")}>Settlement</Button>
              </div>
            )
          })()}

          {activeTab === "details" && (
            <>
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
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Invoice Date *</span>
                <input
                  type="date"
                  value={draftInvDate}
                  onChange={(e) => setDraftInvDate(e.target.value)}
                  className={fieldCls}
                />
              </label>
              {isBB ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Period From *</span>
                    <input type="date" value={draftPeriodFrom} onChange={(e) => setDraftPeriodFrom(e.target.value)} className={fieldCls} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Period To *</span>
                    <input type="date" value={draftPeriodTo} onChange={(e) => setDraftPeriodTo(e.target.value)} className={fieldCls} />
                  </label>
                </>
              ) : null}
            </>
          )}

          {activeTab === "submission" && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Submission Date</span>
              <input
                type="date"
                value={draftSubmissionDate}
                onChange={(e) => setDraftSubmissionDate(e.target.value)}
                className={fieldCls}
              />
            </label>
          )}

          {activeTab === "settlement" && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Settlement Date</span>
              <input
                type="date"
                value={draftSettlementDate}
                onChange={(e) => setDraftSettlementDate(e.target.value)}
                className={fieldCls}
              />
            </label>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
