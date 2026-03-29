import { useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { TicketRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

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

export default function SiteTicketsSection({
  tickets,
  canTicketRead,
  canTicketWrite,
  projectId,
  siteId,
  onReload,
}: {
  tickets: TicketRow[]
  canTicketRead: boolean
  canTicketWrite: boolean
  projectId: number | undefined
  siteId: number
  onReload: () => Promise<void>
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ticket_date: TODAY })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")

  if (!canTicketRead && !canTicketWrite) return null

  function openModal() {
    setForm({ ticket_date: TODAY })
    setErr("")
    setShowModal(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErr("")
    try {
      await api.post("/tickets", {
        project_id: projectId,
        site_id: siteId,
        ticket_date: form.ticket_date,
      })
      setShowModal(false)
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to add ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal open={showModal} title="Add Ticket" onClose={() => setShowModal(false)} size="md">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Date</span>
            <input
              type="date"
              value={form.ticket_date}
              onChange={(e) => setForm((c) => ({ ...c, ticket_date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? "Adding..." : "Add Ticket"}
            </Button>
          </div>
        </div>
      </Modal>

      <ActionPanel
        title="Tickets"
        action={canTicketWrite ? (
          <Button type="button" onClick={openModal}>Add Ticket</Button>
        ) : undefined}
      >
        <div className="space-y-3">
          {tickets.length ? tickets.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.ticket_date}</div>
                  <div className="mt-1 text-sm text-jscolors-text/60">Open ticket</div>
                </div>
                {!row.closing_date && canTicketWrite && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => { void api.patch(`/tickets/${row.id}/close`).then(() => onReload()) }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )) : <EmptyState text="No tickets" />}
        </div>
      </ActionPanel>
    </>
  )
}
