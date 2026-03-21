import { useState, type ReactNode } from "react"
import { api } from "../../lib/api"
import type { TicketRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
}

function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
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
  const [ticketForm, setTicketForm] = useState({ ticket_date: TODAY, rfo: "" })

  if (!canTicketRead && !canTicketWrite) return null

  return (
    <ActionPanel title="Tickets">
      {canTicketWrite && (
        <div className="grid gap-3">
          <input
            type="date"
            value={ticketForm.ticket_date}
            onChange={(e) => setTicketForm((c) => ({ ...c, ticket_date: e.target.value }))}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          />
          <textarea
            value={ticketForm.rfo}
            onChange={(e) => setTicketForm((c) => ({ ...c, rfo: e.target.value }))}
            placeholder="Reason / ticket note"
            rows={3}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          />
          <button
            type="button"
            className="premium-button"
            onClick={() => {
              void api
                .post("/tickets", {
                  project_id: projectId,
                  site_id: siteId,
                  ticket_date: ticketForm.ticket_date,
                  rfo: ticketForm.rfo || null,
                })
                .then(() => {
                  setTicketForm({ ticket_date: TODAY, rfo: "" })
                  return onReload()
                })
            }}
          >
            Add Ticket
          </button>
        </div>
      )}
      <div className={canTicketWrite ? "mt-4 space-y-3" : "space-y-3"}>
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
  )
}
