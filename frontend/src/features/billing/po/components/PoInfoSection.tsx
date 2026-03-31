import { useState } from "react"

import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import Modal from "../../../../components/ui/Modal"
import { updatePo } from "../../../../services/billingService"
import type { PO } from "../../types"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

export default function PoInfoSection({ po, onSaved }: { po: PO; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draftNo, setDraftNo] = useState("")
  const [draftDate, setDraftDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openEditor() {
    setDraftNo(po.po_no ?? "")
    setDraftDate(po.po_date ?? "")
    setError("")
    setEditing(true)
  }

  async function save() {
    if (!draftNo.trim() || !draftDate) {
      setError("PO Number and Date are both required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await updatePo(po.id, { po_no: draftNo, po_date: draftDate })
      setEditing(false)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Failed to update PO.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">PO Information</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailFieldCard label="PO Number" value={<FieldRenderer value={po.po_no} />} onEdit={openEditor} />
        <DetailFieldCard label="PO Date" value={<FieldRenderer value={po.po_date} />} onEdit={openEditor} />
      </div>

      <Modal
        isOpen={editing}
        title="Edit PO Details"
        onClose={() => { setEditing(false); setError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void save()}
        isSubmitting={saving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Number *</span>
            <input
              type="text"
              value={draftNo}
              onChange={(e) => setDraftNo(sanitizeDocNo(e.target.value))}
              className={fieldCls}
              placeholder="e.g. PO/2026/001"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Date *</span>
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
