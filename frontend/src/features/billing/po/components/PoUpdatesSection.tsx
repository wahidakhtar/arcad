import { useCallback, useEffect, useState } from "react"

import Button from "../../../../components/ui/Button"
import EmptyState from "../../../../components/ui/EmptyState"
import Modal from "../../../../components/ui/Modal"
import { useAuth } from "../../../../context/AuthContext"
import { api } from "../../../../lib/api"

type PoUpdateRow = {
  id: number
  date: string
  update: string
  followup_date: string | null
}

const TODAY = new Date().toISOString().slice(0, 10)

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45"

export default function PoUpdatesSection({ poId }: { poId: number }) {
  const { can } = useAuth()
  const canRead = can("acc_update", "read")
  const canWrite = can("acc_update", "write")

  const [updates, setUpdates] = useState<PoUpdateRow[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date: TODAY, update: "", followup_date: "" })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")

  const loadUpdates = useCallback(async () => {
    if (!canRead) return
    try {
      const res = await api.get<PoUpdateRow[]>(`/billing/po/${poId}/updates`)
      setUpdates(Array.isArray(res.data) ? res.data : [])
    } catch {
      // silently ignore — section just shows empty
    }
  }, [poId, canRead])

  useEffect(() => {
    void loadUpdates()
  }, [loadUpdates])

  if (!canRead && !canWrite) return null

  function openModal() {
    setForm({ date: TODAY, update: "", followup_date: "" })
    setErr("")
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.update.trim()) return
    setSubmitting(true)
    setErr("")
    try {
      await api.post(`/billing/po/${poId}/updates`, {
        date: form.date,
        update: form.update.trim(),
        followup_date: form.followup_date || null,
      })
      setShowModal(false)
      await loadUpdates()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to add update.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal open={showModal} title="Add PO Update" onClose={() => setShowModal(false)} size="md">
        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className={fieldCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Update Note</span>
            <textarea
              value={form.update}
              onChange={(e) => setForm((c) => ({ ...c, update: e.target.value }))}
              placeholder="Write update note..."
              rows={4}
              className={fieldCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Follow-up Date (optional)</span>
            <input
              type="date"
              value={form.followup_date}
              onChange={(e) => setForm((c) => ({ ...c, followup_date: e.target.value }))}
              className={fieldCls}
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button
            type="button"
            className="w-full"
            disabled={submitting || !form.update.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Adding..." : "Add Update"}
          </Button>
        </div>
      </Modal>

      <section className="glass-panel p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">PO Updates</p>
          {canWrite && (
            <Button type="button" onClick={openModal}>Add Update</Button>
          )}
        </div>
        <div className="mt-5 space-y-3">
          {updates.length ? updates.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="text-sm font-semibold text-jscolors-text">{row.date}</div>
              <div className="mt-1 text-sm text-jscolors-text/60">
                {row.update}{row.followup_date ? ` • Follow-up ${row.followup_date}` : ""}
              </div>
            </div>
          )) : <EmptyState text="No updates yet" />}
        </div>
      </section>
    </>
  )
}
