import { useState } from "react"

import DataTable from "../../../../components/ui/DataTable"
import Modal from "../../../../components/ui/Modal"
import { rejectInvoice, updateInvoice } from "../../../../services/billingService"
import type { Invoice } from "../../types"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

type Tab = "details" | "submission" | "settlement"

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
        active
          ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
          : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40"
      }`}
    >
      {children}
    </button>
  )
}

export default function InvoiceTable({ invoices, onSaved }: { invoices: Invoice[]; onSaved: () => Promise<void> }) {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [draftNo, setDraftNo] = useState("")
  const [draftInvDate, setDraftInvDate] = useState("")
  const [draftSubmissionDate, setDraftSubmissionDate] = useState("")
  const [draftSettlementDate, setDraftSettlementDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState("")

  function openEdit(invoice: Invoice) {
    setDraftNo(invoice.invoice_no ?? "")
    setDraftInvDate(invoice.invoice_date ?? "")
    setDraftSubmissionDate(invoice.submission_date ?? "")
    setDraftSettlementDate(invoice.settlement_date ?? "")
    setActiveTab("details")
    setError("")
    setEditingInvoice(invoice)
  }

  async function save() {
    if (!editingInvoice) return
    if (!draftNo.trim() || !draftInvDate) {
      setActiveTab("details")
      setError("Invoice Number and Invoice Date are both required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await updateInvoice(editingInvoice.id, {
        invoice_no: draftNo,
        invoice_date: draftInvDate,
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

  async function reject() {
    if (!editingInvoice) return
    setRejecting(true)
    setError("")
    try {
      await rejectInvoice(editingInvoice.id)
      setEditingInvoice(null)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Failed to reject invoice.")
    } finally {
      setRejecting(false)
    }
  }

  const isRaised = editingInvoice?.invoice_status?.label?.toLowerCase() === "raised"

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Invoices</p>
      <div className="mt-5">
        <DataTable
          columns={[
            { key: "invoice_no", label: "Invoice Number", minWidth: 180 },
            { key: "invoice_date", label: "Invoice Date", minWidth: 130, type: "date" },
            { key: "amount", label: "Amount", minWidth: 120 },
            { key: "invoice_status", label: "Status", type: "badge", minWidth: 160 },
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
          <div className="flex gap-2">
            <TabPill active={activeTab === "details"} onClick={() => setActiveTab("details")}>Details</TabPill>
            <TabPill active={activeTab === "submission"} onClick={() => setActiveTab("submission")}>Submission</TabPill>
            <TabPill active={activeTab === "settlement"} onClick={() => setActiveTab("settlement")}>Settlement</TabPill>
          </div>

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

          {isRaised && (
            <button
              type="button"
              onClick={() => void reject()}
              disabled={rejecting}
              className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              {rejecting ? "Rejecting..." : "Reject Invoice"}
            </button>
          )}
        </div>
      </Modal>
    </section>
  )
}
