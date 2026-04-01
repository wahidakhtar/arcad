import { useEffect, useMemo, useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import SelectInput from "../../components/ui/SelectInput"
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

type TimeDraft = {
  hour: string
  minute: string
  ampm: "AM" | "PM"
}

type TicketFormState = {
  ticket_date: string
  closing_date: string
  punch_point_ids: number[]
  ticket_time_ui: TimeDraft
  closing_time_ui: TimeDraft
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

const emptyTime = (): TimeDraft => ({ hour: "12", minute: "00", ampm: "AM" })

const emptyForm = (): TicketFormState => ({
  ticket_date: TODAY,
  closing_date: TODAY,
  punch_point_ids: [],
  ticket_time_ui: emptyTime(),
  closing_time_ui: emptyTime(),
})

function timeStringToUi(value?: string | null): TimeDraft {
  if (!value) return emptyTime()
  const [rawHour = "00", rawMinute = "00"] = value.split(":")
  const hour24 = Number(rawHour)
  if (!Number.isFinite(hour24)) return emptyTime()
  const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 || 12
  return { hour: String(hour12), minute: rawMinute.padStart(2, "0"), ampm }
}

function uiToTimeString(value: TimeDraft): string {
  const hour12 = Number(value.hour)
  const minute = Number(value.minute)
  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12 || !Number.isFinite(minute) || minute < 0 || minute > 59) return ""
  let hour24 = hour12 % 12
  if (value.ampm === "PM") hour24 += 12
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function toggleSelection(selectedIds: number[], pointId: number): number[] {
  return selectedIds.includes(pointId)
    ? selectedIds.filter((value) => value !== pointId)
    : [...selectedIds, pointId]
}

function ticketIssueLabel(projectKey: string) {
  return projectKey === "bb" ? "RFO" : "Punch Points"
}

function ticketIssuePlaceholder(projectKey: string) {
  return projectKey === "bb" ? "Add new RFO" : "Add new punch point"
}

function PunchPointField({
  points,
  selectedIds,
  onToggle,
  canWrite,
  addLabel,
  setAddLabel,
  onAdd,
  addBusy,
  issueLabel,
  emptyLabel,
  addPlaceholder,
}: {
  points: PunchPointRow[]
  selectedIds: number[]
  onToggle: (value: number) => void
  canWrite: boolean
  addLabel: string
  setAddLabel: (value: string) => void
  onAdd: () => void
  addBusy: boolean
  issueLabel: string
  emptyLabel: string
  addPlaceholder: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{issueLabel}</span>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
          {points.length ? points.map((point) => {
            const checked = selectedIds.includes(point.id)
            return (
              <label key={point.id} className="flex cursor-pointer items-center gap-3 text-sm text-jscolors-text">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(point.id)}
                  className="h-4 w-4 rounded border-jscolors-crimson/30 text-jscolors-crimson focus:ring-jscolors-crimson/30"
                />
                <span>{point.label}</span>
              </label>
            )
          }) : <p className="text-sm text-jscolors-text/50">{emptyLabel}</p>}
        </div>
      </div>
      {canWrite ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={addLabel}
            onChange={(event) => setAddLabel(event.target.value)}
            className="flex-1 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
            placeholder={addPlaceholder}
          />
          <Button type="button" variant="secondary" onClick={onAdd} disabled={addBusy || !addLabel.trim()}>
            {addBusy ? "Adding..." : "Add"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: TimeDraft
  onChange: (value: TimeDraft) => void
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{label} *</span>
      <div className="grid grid-cols-[1fr_1fr_0.9fr] gap-2">
        <SelectInput value={value.hour} onChange={(event) => onChange({ ...value, hour: event.target.value })}>
          {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
        </SelectInput>
        <SelectInput value={value.minute} onChange={(event) => onChange({ ...value, minute: event.target.value })}>
          {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </SelectInput>
        <SelectInput value={value.ampm} onChange={(event) => onChange({ ...value, ampm: event.target.value as "AM" | "PM" })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </SelectInput>
      </div>
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
  const [form, setForm] = useState<TicketFormState>(emptyForm())
  const [localPunchPoints, setLocalPunchPoints] = useState<PunchPointRow[]>(punchPoints)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")
  const [closeErr, setCloseErr] = useState("")
  const [newPunchPointLabel, setNewPunchPointLabel] = useState("")
  const [addingPunchPoint, setAddingPunchPoint] = useState(false)
  const issueLabel = ticketIssueLabel(projectKey)
  const emptyIssueLabel = projectKey === "bb" ? "No RFO added yet." : "No punch points yet."
  const addIssuePlaceholder = ticketIssuePlaceholder(projectKey)

  useEffect(() => {
    setLocalPunchPoints(punchPoints)
  }, [punchPoints])

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => `${b.ticket_date}${b.ticket_time ?? ""}`.localeCompare(`${a.ticket_date}${a.ticket_time ?? ""}`)),
    [tickets],
  )

  if (!canTicketRead && !canTicketWrite) return null

  function resetForm() {
    setForm(emptyForm())
    setErr("")
    setCloseErr("")
    setNewPunchPointLabel("")
  }

  function openCreateModal() {
    resetForm()
    setShowCreateModal(true)
  }

  function openCloseModal(ticket: TicketRow) {
    setActiveTicket(ticket)
    setForm({
      ...emptyForm(),
      closing_date: TODAY,
      punch_point_ids: (ticket.punch_points ?? []).map((point) => point.id),
      ticket_date: ticket.ticket_date,
      ticket_time_ui: timeStringToUi(ticket.ticket_time),
      closing_time_ui: timeStringToUi(ticket.closing_time),
    })
    setCloseErr("")
    setNewPunchPointLabel("")
    setShowCloseModal(true)
  }

  function openEditModal(ticket: TicketRow) {
    setActiveTicket(ticket)
    setForm({
      ...emptyForm(),
      punch_point_ids: (ticket.punch_points ?? []).map((point) => point.id),
      ticket_date: ticket.ticket_date,
      ticket_time_ui: timeStringToUi(ticket.ticket_time),
    })
    setErr("")
    setNewPunchPointLabel("")
    setShowEditModal(true)
  }

  async function addPunchPoint() {
    if (!newPunchPointLabel.trim()) return
    setAddingPunchPoint(true)
    const errorSetter = showCloseModal ? setCloseErr : setErr
    errorSetter("")
    try {
      const response = await api.post<PunchPointRow>(`/projects/${projectKey}/punch-points`, { label: newPunchPointLabel.trim() })
      const point = response.data
      setLocalPunchPoints((current) => current.some((row) => row.id === point.id) ? current : [...current, point])
      setForm((current) => ({
        ...current,
        punch_point_ids: current.punch_point_ids.includes(point.id) ? current.punch_point_ids : [...current.punch_point_ids, point.id],
      }))
      setNewPunchPointLabel("")
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      errorSetter(detail ?? `Failed to add ${issueLabel.toLowerCase()}.`)
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
        ticket_time: projectKey === "bb" ? uiToTimeString(form.ticket_time_ui) : undefined,
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
      setErr(detail ?? `Failed to update ${issueLabel.toLowerCase()}.`)
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
        closing_time: projectKey === "bb" ? uiToTimeString(form.closing_time_ui) : undefined,
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
            <TimeField
              label="Time"
              value={form.ticket_time_ui}
              onChange={(value) => setForm((current) => ({ ...current, ticket_time_ui: value }))}
            />
          ) : null}
          <PunchPointField
            points={localPunchPoints}
            selectedIds={form.punch_point_ids}
            onToggle={(pointId) => setForm((current) => ({ ...current, punch_point_ids: toggleSelection(current.punch_point_ids, pointId) }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
            issueLabel={issueLabel}
            emptyLabel={emptyIssueLabel}
            addPlaceholder={addIssuePlaceholder}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        title={`Ticket ${issueLabel}`}
        onClose={() => setShowEditModal(false)}
        size="md"
        submitLabel="Save"
        onSubmit={() => void handlePunchPointSave()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <PunchPointField
            points={localPunchPoints}
            selectedIds={form.punch_point_ids}
            onToggle={(pointId) => setForm((current) => ({ ...current, punch_point_ids: toggleSelection(current.punch_point_ids, pointId) }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
            issueLabel={issueLabel}
            emptyLabel={emptyIssueLabel}
            addPlaceholder={addIssuePlaceholder}
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
            <TimeField
              label="Closing Time"
              value={form.closing_time_ui}
              onChange={(value) => setForm((current) => ({ ...current, closing_time_ui: value }))}
            />
          ) : null}
          <PunchPointField
            points={localPunchPoints}
            selectedIds={form.punch_point_ids}
            onToggle={(pointId) => setForm((current) => ({ ...current, punch_point_ids: toggleSelection(current.punch_point_ids, pointId) }))}
            canWrite={canTicketWrite}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            addBusy={addingPunchPoint}
            issueLabel={issueLabel}
            emptyLabel={emptyIssueLabel}
            addPlaceholder={addIssuePlaceholder}
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
            const punchPointLabel = row.punch_points?.length ? row.punch_points.map((point) => point.label).join(", ") : `No ${issueLabel.toLowerCase()} selected`
            return (
              <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-jscolors-text">{row.ticket_number ?? `TKT-${row.id}`}</div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-jscolors-text/65">{issueLabel}: {punchPointLabel}</div>
                  </div>
                  {isOpen && canTicketWrite ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" className="shrink-0" onClick={() => openEditModal(row)}>
                        {projectKey === "bb" ? "Edit RFO" : "Edit Punch Points"}
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
