import { useMemo, useState, type ChangeEvent, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { PunchPointRow, TicketRow } from "./siteDetailTypes"
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

type TicketFormState = {
  ticket_date: string
  ticket_time: string
  closing_date: string
  closing_time: string
  punch_point_ids: number[]
}

const emptyForm: TicketFormState = {
  ticket_date: TODAY,
  ticket_time: "",
  closing_date: TODAY,
  closing_time: "",
  punch_point_ids: [],
}

function parseSelectedIds(event: ChangeEvent<HTMLSelectElement>): number[] {
  return Array.from(event.target.selectedOptions)
    .map((option) => Number(option.value))
    .filter((value) => Number.isFinite(value))
}

function PunchPointField({
  points,
  selectedIds,
  onChange,
  canWrite,
  addLabel,
  setAddLabel,
  onAdd,
  addBusy,
}: {
  points: PunchPointRow[]
  selectedIds: number[]
  onChange: (value: number[]) => void
  canWrite: boolean
  addLabel: string
  setAddLabel: (value: string) => void
  onAdd: () => void
  addBusy: boolean
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Punch Points</span>
        <select
          multiple
          value={selectedIds.map(String)}
          onChange={(event) => onChange(parseSelectedIds(event))}
          className="min-h-32 w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
        >
          {points.map((point) => (
            <option key={point.id} value={point.id}>{point.label}</option>
          ))}
        </select>
        <span className="mt-2 block text-xs text-jscolors-text/50">Hold Command/Ctrl to select multiple.</span>
      </label>
      {canWrite ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={addLabel}
            onChange={(event) => setAddLabel(event.target.value)}
            className="flex-1 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
            placeholder="Add new punch point"
          />
          <Button type="button" variant="secondary" onClick={onAdd} disabled={addBusy || !addLabel.trim()}>
            {addBusy ? "Adding..." : "Add"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function SiteTicketsSection({
  tickets,
  punchPoints,
  canTicketRead,
  canTicketWrite,
  projectId,
  siteId,
  statusKey,
  projectKey,
  onReload,
}: {
  tickets: TicketRow[]
  punchPoints: PunchPointRow[]
  canTicketRead: boolean
  canTicketWrite: boolean
  projectId: number | undefined
  siteId: number
  statusKey: string
  projectKey: string
  onReload: () => Promise<void>
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null)
  const [form, setForm] = useState<TicketFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")
  const [closeErr, setCloseErr] = useState("")
  const [newPunchPointLabel, setNewPunchPointLabel] = useState("")
  const [addingPunchPoint, setAddingPunchPoint] = useState(false)

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => `${b.ticket_date}${b.ticket_time ?? ""}`.localeCompare(`${a.ticket_date}${a.ticket_time ?? ""}`)),
    [tickets],
  )

  if (!canTicketRead && !canTicketWrite) return null

  function resetForm() {
    setForm(emptyForm)
    setErr("")
    setCloseErr("")
    setNewPunchPointLabel("")
  }

  function openCreateModal() {
    resetForm()
    setForm((current) => ({ ...current, ticket_date: TODAY, closing_date: TODAY }))
    setShowCreateModal(true)
  }

  function openCloseModal(ticket: TicketRow) {
    setActiveTicket(ticket)
    setForm({
      ...emptyForm,
      closing_date: TODAY,
      closing_time: "",
      punch_point_ids: (ticket.punch_points ?? []).map((point) => point.id),
      ticket_date: ticket.ticket_date,
      ticket_time: ticket.ticket_time ?? "",
    })
    setCloseErr("")
    setNewPunchPointLabel("")
    setShowCloseModal(true)
  }

  function openEditModal(ticket: TicketRow) {
    setActiveTicket(ticket)
    setForm({
      ...emptyForm,
      punch_point_ids: (ticket.punch_points ?? []).map((point) => point.id),
      ticket_date: ticket.ticket_date,
      ticket_time: ticket.ticket_time ?? "",
      closing_date: TODAY,
    })
    setErr("")
    setNewPunchPointLabel("")
    setShowEditModal(true)
  }

  async function addPunchPoint() {
    if (!newPunchPointLabel.trim()) return
    setAddingPunchPoint(true)
    try {
      const response = await api.post<PunchPointRow>(`/projects/${projectKey}/punch-points`, { label: newPunchPointLabel.trim() })
      const point = response.data
      setForm((current) => ({
        ...current,
        punch_point_ids: current.punch_point_ids.includes(point.id) ? current.punch_point_ids : [...current.punch_point_ids, point.id],
      }))
      setNewPunchPointLabel("")
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (showCloseModal) setCloseErr(detail ?? "Failed to add punch point.")
      else setErr(detail ?? "Failed to add punch point.")
    } finally {
      setAddingPunchPoint(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErr("")
    try {
      await api.post("/tickets", {
        project_id: projectId,
        site_id: siteId,
        ticket_date: form.ticket_date,
        ticket_time: projectKey === "bb" ? form.ticket_time : undefined,
        punch_point_ids: form.punch_point_ids,
      })
      setShowCreateModal(false)
      resetForm()
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to add ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePunchPointSave() {
    if (!activeTicket) return
    setSubmitting(true)
    setErr("")
    try {
      await api.patch(`/tickets/${activeTicket.id}`, { punch_point_ids: form.punch_point_ids })
      setShowEditModal(false)
      setActiveTicket(null)
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to update punch points.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClose() {
    if (!activeTicket) return
    setSubmitting(true)
    setCloseErr("")
    try {
      await api.patch(`/tickets/${activeTicket.id}/close`, {
        closing_date: form.closing_date,
        closing_time: projectKey === "bb" ? form.closing_time : undefined,
        punch_point_ids: form.punch_point_ids,
      })
      setShowCloseModal(false)
      setActiveTicket(null)
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setCloseErr(detail ?? "Failed to close ticket.")
    } finally {
      setSubmitting(false)
    }
  }

  const hasOpenTicket = tickets.some((ticket) => !ticket.closing_date)
  const canAddTicket = !hasOpenTicket && ((projectKey === "bb" && statusKey === "live") || (projectKey !== "bb" && statusKey === "comp"))

  return (
    <>
      <Modal
        isOpen={showCreateModal}
        title="Add Ticket"
        onClose={() => setShowCreateModal(false)}
        size="md"
        submitLabel="Add Ticket"
        onSubmit={() => void handleSubmit()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Date *</span>
            <input
              type="date"
              value={form.ticket_date}
              onChange={(e) => setForm((c) => ({ ...c, ticket_date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              max={TODAY}
            />
          </label>
          {projectKey === "bb" ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Time *</span>
              <input
                type="time"
                value={form.ticket_time}
                onChange={(e) => setForm((c) => ({ ...c, ticket_time: e.target.value }))}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              />
            </label>
          ) : null}
          <PunchPointField
            points={punchPoints}
            selectedIds={form.punch_point_ids}
            onChange={(value) => setForm((current) => ({ ...current, punch_point_ids: value }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        title="Ticket Punch Points"
        onClose={() => setShowEditModal(false)}
        size="md"
        submitLabel="Save"
        onSubmit={() => void handlePunchPointSave()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <PunchPointField
            points={punchPoints}
            selectedIds={form.punch_point_ids}
            onChange={(value) => setForm((current) => ({ ...current, punch_point_ids: value }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={showCloseModal}
        title="Close Ticket"
        onClose={() => setShowCloseModal(false)}
        size="md"
        submitLabel="Close Ticket"
        onSubmit={() => void handleClose()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Closing Date *</span>
            <input
              type="date"
              value={form.closing_date}
              onChange={(e) => setForm((c) => ({ ...c, closing_date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              max={TODAY}
            />
          </label>
          {projectKey === "bb" ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Closing Time *</span>
              <input
                type="time"
                value={form.closing_time}
                onChange={(e) => setForm((c) => ({ ...c, closing_time: e.target.value }))}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              />
            </label>
          ) : null}
          <PunchPointField
            points={punchPoints}
            selectedIds={form.punch_point_ids}
            onChange={(value) => setForm((current) => ({ ...current, punch_point_ids: value }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
          />
          {closeErr ? <p className="text-sm text-red-600">{closeErr}</p> : null}
        </div>
      </Modal>

      <ActionPanel
        title="Tickets"
        action={canTicketWrite ? <Button type="button" variant={canAddTicket ? "primary" : "ghost"} disabled={!canAddTicket} onClick={openCreateModal}>Add Ticket</Button> : undefined}
      >
        <div className="space-y-3">
          {sortedTickets.length ? sortedTickets.map((row) => {
            const isOpen = !row.closing_date
            const punchPointLabel = row.punch_points?.length ? row.punch_points.map((point) => point.label).join(", ") : "No punch point selected"
            return (
              <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-jscolors-text">{row.ticket_number ?? `TKT-${row.id}`}</div>
                    <div className="mt-1 text-sm text-jscolors-text/60">
                      Opened {row.ticket_date}{row.ticket_time ? ` ${row.ticket_time}` : ""}
                    </div>
                    <div className="mt-1 text-sm text-jscolors-text/60">
                      {isOpen ? "Open ticket" : `Closed ${row.closing_date}${row.closing_time ? ` ${row.closing_time}` : ""}`}
                    </div>
                    <div className="mt-2 text-sm text-jscolors-text/65">Punch Points: {punchPointLabel}</div>
                  </div>
                  {isOpen && canTicketWrite ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" className="shrink-0" onClick={() => openEditModal(row)}>
                        Punch Points
                      </Button>
                      <Button type="button" variant="secondary" className="shrink-0" onClick={() => openCloseModal(row)}>
                        Close
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          }) : <EmptyState text="No tickets" />}
        </div>
      </ActionPanel>
    </>
  )
}
