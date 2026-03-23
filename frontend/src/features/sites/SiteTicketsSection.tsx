import { useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { api } from "../../lib/api"
import type { TicketRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
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
  const [form, setForm] = useState({ ticket_date: TODAY, rfo: "" })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")

  if (!canTicketRead && !canTicketWrite) return null

  function openModal() {
    setForm({ ticket_date: TODAY, rfo: "" })
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
        rfo: form.rfo || null,
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
      {showModal && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-md p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Add Ticket</h2>
              <button type="button" onClick={() => setShowModal(false)} className="premium-button-secondary">Close</button>
            </div>
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
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Reason / Note</span>
                <textarea
                  value={form.rfo}
                  onChange={(e) => setForm((c) => ({ ...c, rfo: e.target.value }))}
                  placeholder="Reason / ticket note"
                  rows={4}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
              <button
                type="button"
                className="premium-button w-full"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Adding..." : "Add Ticket"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ActionPanel
        title="Tickets"
        action={canTicketWrite ? (
          <button type="button" className="premium-button" onClick={openModal}>Add Ticket</button>
        ) : undefined}
      >
        <div className="space-y-3">
          {tickets.length ? tickets.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.ticket_date}</div>
                  <div className="mt-1 text-sm text-jscolors-text/60">{row.rfo || "Open ticket"}</div>
                </div>
                {!row.closing_date && canTicketWrite && (
                  <button
                    type="button"
                    className="premium-button-secondary shrink-0"
                    onClick={() => { void api.patch(`/tickets/${row.id}/close`).then(() => onReload()) }}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          )) : <EmptyState text="No tickets" />}
        </div>
      </ActionPanel>
    </>
  )
}
