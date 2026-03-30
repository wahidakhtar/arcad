import { useState } from "react"

import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import Modal from "../../../../components/ui/Modal"
import { updatePo } from "../../../../services/billingService"
import type { PO } from "../../types"

type EditableField = "po_no" | "po_date" | null

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

export default function PoInfoSection({ po, onSaved }: { po: PO; onSaved: () => Promise<void> }) {
  const [editingField, setEditingField] = useState<EditableField>(null)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openEditor(field: Exclude<EditableField, null>) {
    setEditingField(field)
    setDraft(field === "po_date" ? (po.po_date ?? "") : (po.po_no ?? ""))
    setError("")
  }

  async function saveField() {
    if (!editingField) return
    setSaving(true)
    setError("")
    try {
      await updatePo(po.id, { [editingField]: draft || null })
      setEditingField(null)
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
        <DetailFieldCard label="PO Number" value={<FieldRenderer value={po.po_no} />} onEdit={() => openEditor("po_no")} />
        <DetailFieldCard label="PO Date" value={<FieldRenderer value={po.po_date} />} onEdit={() => openEditor("po_date")} />
      </div>

      <Modal
        isOpen={editingField !== null}
        title={editingField === "po_date" ? "Edit PO Date" : "Edit PO Number"}
        onClose={() => {
          setEditingField(null)
          setError("")
        }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void saveField()}
        isSubmitting={saving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">
              {editingField === "po_date" ? "PO Date" : "PO Number"}
            </span>
            <input
              type={editingField === "po_date" ? "date" : "text"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={fieldCls}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
