import { useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { UpdateRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

function InfoRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="text-sm font-semibold text-jscolors-text">{title}</div>
      <div className="mt-1 text-sm text-jscolors-text/60">{text}</div>
    </div>
  )
}

function ActionPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function SiteUpdatesSection({
  updates,
  canReadOpsUpdates,
  canReadAccUpdates,
  canAddUpdate,
  projectId,
  siteId,
  onReload,
}: {
  updates: UpdateRow[]
  canReadOpsUpdates: boolean
  canReadAccUpdates: boolean
  canAddUpdate: boolean
  projectId: number | undefined
  siteId: number
  onReload: () => Promise<void>
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date: TODAY, update: "", followup_date: "" })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")

  if (!canReadOpsUpdates && !canReadAccUpdates && !canAddUpdate) return null

  // Filtering is handled server-side based on user permissions
  const visibleUpdates = updates

  function openModal() {
    setForm({ date: TODAY, update: "", followup_date: "" })
    setErr("")
    setShowModal(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErr("")
    try {
      await api.post("/updates", {
        project_id: projectId,
        site_id: siteId,
        date: form.date,
        update: form.update,
        followup_date: form.followup_date || null,
      })
      setShowModal(false)
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to add update.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal open={showModal} title="Add Update" onClose={() => setShowModal(false)} size="md">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Update Note</span>
            <textarea
              value={form.update}
              onChange={(e) => setForm((c) => ({ ...c, update: e.target.value }))}
              placeholder="Write update note..."
              rows={4}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Follow-up Date (optional)</span>
            <input
              type="date"
              value={form.followup_date}
              onChange={(e) => setForm((c) => ({ ...c, followup_date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="button" className="w-full" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Adding..." : "Add Update"}
          </Button>
        </div>
      </Modal>

      <ActionPanel
        title="Updates"
        action={canAddUpdate ? (
          <Button type="button" onClick={openModal}>Add Update</Button>
        ) : undefined}
      >
        <div className="space-y-3">
          {visibleUpdates.length ? visibleUpdates.map((row) => (
            <InfoRow
              key={row.id}
              title={row.date}
              text={`${row.update}${row.followup_date ? ` • Follow-up ${row.followup_date}` : ""}`}
            />
          )) : <EmptyState text="No updates yet" />}
        </div>
      </ActionPanel>
    </>
  )
}
