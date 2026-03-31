import { useState } from "react"

import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import Modal from "../../../../components/ui/Modal"
import { updateInvoice, updatePo } from "../../../../services/billingService"
import type { SiteDetail } from "../../siteDetailTypes"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

type Props = {
  site: SiteDetail
  canWrite: boolean
  onSaved: () => Promise<void>
}

export default function SiteBillingSection({ site, canWrite, onSaved }: Props) {
  const poId = site.fields.po_id as number | null | undefined
  const invoiceId = site.fields.invoice_id as number | null | undefined

  const [editingPo, setEditingPo] = useState(false)
  const [draftPoNo, setDraftPoNo] = useState("")
  const [draftPoDate, setDraftPoDate] = useState("")
  const [poSaving, setPoSaving] = useState(false)
  const [poError, setPoError] = useState("")

  const [editingInv, setEditingInv] = useState(false)
  const [draftInvNo, setDraftInvNo] = useState("")
  const [draftInvDate, setDraftInvDate] = useState("")
  const [invSaving, setInvSaving] = useState(false)
  const [invError, setInvError] = useState("")

  if (!poId) return null

  function openPoEditor() {
    setDraftPoNo((site.fields.po_number as string | null) ?? "")
    setDraftPoDate((site.fields.po_date as string | null) ?? "")
    setPoError("")
    setEditingPo(true)
  }

  async function savePo() {
    if (!draftPoNo.trim() || !draftPoDate) {
      setPoError("PO Number and Date are both required.")
      return
    }
    setPoSaving(true)
    setPoError("")
    try {
      await updatePo(poId!, { po_no: draftPoNo, po_date: draftPoDate })
      setEditingPo(false)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPoError(detail ?? "Failed to update PO.")
    } finally {
      setPoSaving(false)
    }
  }

  function openInvEditor() {
    setDraftInvNo((site.fields.invoice_number as string | null) ?? "")
    setDraftInvDate((site.fields.invoice_date as string | null) ?? "")
    setInvError("")
    setEditingInv(true)
  }

  async function saveInv() {
    if (!draftInvNo.trim() || !draftInvDate) {
      setInvError("Invoice Number and Invoice Date are both required.")
      return
    }
    setInvSaving(true)
    setInvError("")
    try {
      await updateInvoice(invoiceId!, { invoice_no: draftInvNo, invoice_date: draftInvDate })
      setEditingInv(false)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setInvError(detail ?? "Failed to update invoice.")
    } finally {
      setInvSaving(false)
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Billing</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailFieldCard
          label="PO Number"
          value={<FieldRenderer value={site.fields.po_number} />}
          onEdit={canWrite ? openPoEditor : undefined}
          onAdd={canWrite && !site.fields.po_number ? openPoEditor : undefined}
        />
        <DetailFieldCard
          label="PO Date"
          value={<FieldRenderer type="date" value={site.fields.po_date} />}
          onEdit={canWrite ? openPoEditor : undefined}
          onAdd={canWrite && !site.fields.po_date ? openPoEditor : undefined}
        />
        {invoiceId ? (
          <>
            <DetailFieldCard
              label="Invoice Number"
              value={<FieldRenderer value={site.fields.invoice_number} />}
              onEdit={canWrite ? openInvEditor : undefined}
              onAdd={canWrite && !site.fields.invoice_number ? openInvEditor : undefined}
            />
            <DetailFieldCard
              label="Invoice Date"
              value={<FieldRenderer type="date" value={site.fields.invoice_date} />}
              onEdit={canWrite && !!site.fields.invoice_date ? openInvEditor : undefined}
              onAdd={canWrite && !site.fields.invoice_date ? openInvEditor : undefined}
            />
          </>
        ) : null}
      </div>

      <Modal
        isOpen={editingPo}
        title="Edit PO Details"
        onClose={() => { setEditingPo(false); setPoError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void savePo()}
        isSubmitting={poSaving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Number *</span>
            <input
              type="text"
              value={draftPoNo}
              onChange={(e) => setDraftPoNo(sanitizeDocNo(e.target.value))}
              className={fieldCls}
              placeholder="e.g. PO/2026/001"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Date *</span>
            <input
              type="date"
              value={draftPoDate}
              onChange={(e) => setDraftPoDate(e.target.value)}
              className={fieldCls}
            />
          </label>
          {poError ? <p className="text-sm text-red-600">{poError}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={editingInv}
        title="Edit Invoice Details"
        onClose={() => { setEditingInv(false); setInvError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void saveInv()}
        isSubmitting={invSaving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Invoice Number *</span>
            <input
              type="text"
              value={draftInvNo}
              onChange={(e) => setDraftInvNo(sanitizeDocNo(e.target.value))}
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
          {invError ? <p className="text-sm text-red-600">{invError}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
