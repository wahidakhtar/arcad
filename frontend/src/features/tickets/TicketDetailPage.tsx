import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import DetailFieldCard from "../../components/ui/DetailFieldCard"
import Modal from "../../components/ui/Modal"
import SelectInput from "../../components/ui/SelectInput"
import { subscribe } from "../../hooks/useWebSocket"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

const TODAY = new Date().toISOString().slice(0, 10)

type PunchPointRow = {
  id: number
  label: string
}

type TicketRaw = {
  id: number
  project_id: number
  site_id: number
  ticket_number: string | null
  ticket_date: string
  ticket_time?: string | null
  closing_date: string | null
  closing_time?: string | null
  punch_points?: PunchPointRow[]
}

type ProjectEntry = {
  id: number
  key: string
  label: string
  active: boolean
  recurring: boolean
}

type SiteLookup = {
  id: number
  ckt_id: string
}

type TimeDraft = {
  hour: string
  minute: string
  ampm: "AM" | "PM"
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

function emptyTime(): TimeDraft {
  return { hour: "12", minute: "00", ampm: "AM" }
}

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
  addLabel,
  setAddLabel,
  onAdd,
  adding,
  issueLabel,
  emptyLabel,
  addPlaceholder,
}: {
  points: PunchPointRow[]
  selectedIds: number[]
  onToggle: (pointId: number) => void
  addLabel: string
  setAddLabel: (value: string) => void
  onAdd: () => void
  adding: boolean
  issueLabel: string
  emptyLabel: string
  addPlaceholder: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{issueLabel}</span>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
          {points.length ? points.map((point) => (
            <label key={point.id} className="flex cursor-pointer items-center gap-3 text-sm text-jscolors-text">
              <input
                type="checkbox"
                checked={selectedIds.includes(point.id)}
                onChange={() => onToggle(point.id)}
                className="h-4 w-4 rounded border-jscolors-crimson/30 text-jscolors-crimson focus:ring-jscolors-crimson/30"
              />
              <span>{point.label}</span>
            </label>
          )) : <p className="text-sm text-jscolors-text/50">{emptyLabel}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={addLabel}
          onChange={(event) => setAddLabel(event.target.value)}
          className="flex-1 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
          placeholder={addPlaceholder}
        />
        <Button type="button" variant="secondary" onClick={onAdd} disabled={!addLabel.trim() || adding}>
          Add
        </Button>
      </div>
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

export default function TicketDetailPage() {
  const { can } = useAuth()
  const { ticketId } = useParams()
  const [ticket, setTicket] = useState<TicketRaw | null>(null)
  const [projectLabel, setProjectLabel] = useState("")
  const [projectKey, setProjectKey] = useState("")
  const [cktId, setCktId] = useState("")
  const [punchPoints, setPunchPoints] = useState<PunchPointRow[]>([])
  const [selectedPunchPointIds, setSelectedPunchPointIds] = useState<number[]>([])
  const [closingDate, setClosingDate] = useState(TODAY)
  const [closingTime, setClosingTime] = useState<TimeDraft>(emptyTime())
  const [newPunchPointLabel, setNewPunchPointLabel] = useState("")
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [closing, setClosing] = useState(false)
  const [savingRfo, setSavingRfo] = useState(false)

  const load = useCallback(async () => {
    try {
      const [ticketRes, projectsRes] = await Promise.all([
        api.get<TicketRaw>(`/tickets/${ticketId}`),
        api.get<ProjectEntry[]>("/me/projects"),
      ])
      const t = ticketRes.data
      setTicket(t)
      setSelectedPunchPointIds((t.punch_points ?? []).map((point) => point.id))

      const projects: ProjectEntry[] = Array.isArray(projectsRes.data) ? projectsRes.data : []
      const proj = projects.find((p) => p.id === t.project_id)
      setProjectLabel(proj?.label ?? String(t.project_id))
      setProjectKey(proj?.key ?? "")

      if (proj) {
        try {
          const [siteRes, punchPointRes] = await Promise.all([
            api.get<SiteLookup>("/sites/lookup", { params: { project_key: proj.key, site_id: t.site_id } }),
            api.get<PunchPointRow[]>(`/projects/${proj.key}/punch-points`),
          ])
          setCktId(siteRes.data.ckt_id ?? String(t.site_id))
          setPunchPoints(Array.isArray(punchPointRes.data) ? punchPointRes.data : [])
        } catch {
          setCktId(String(t.site_id))
          setPunchPoints([])
        }
      }
    } catch {
      setError("Unable to load ticket.")
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    void load()
  }, [load])

  const lastRefetchRef = useRef(0)
  const safeLoad = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void load()
  }, [load])

  useEffect(() => {
    const numericTicketId = Number(ticketId)
    const unsub1 = subscribe("TICKET_CLOSED", (e) => {
      if ((e as { ticket_id: number }).ticket_id === numericTicketId) safeLoad()
    })
    const unsub2 = subscribe("TICKET_CREATED", (e) => {
      if ((e as { ticket_id: number }).ticket_id === numericTicketId) safeLoad()
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [ticketId, safeLoad])

  async function addPunchPoint() {
    if (!newPunchPointLabel.trim() || !projectKey) return
    try {
      const response = await api.post<PunchPointRow>(`/projects/${projectKey}/punch-points`, { label: newPunchPointLabel.trim() })
      setPunchPoints((current) => {
        if (current.some((item) => item.id === response.data.id)) return current
        return [...current, response.data]
      })
      setSelectedPunchPointIds((current) => current.includes(response.data.id) ? current : [...current, response.data.id])
      setNewPunchPointLabel("")
    } catch {
      setError(projectKey === "bb" ? "Unable to add RFO." : "Unable to add punch point.")
    }
  }

  async function savePunchPoints() {
    setSavingRfo(true)
    setError("")
    try {
      await api.patch(`/tickets/${ticketId}`, {
        punch_point_ids: selectedPunchPointIds,
      })
      setShowEditModal(false)
      safeLoad()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? (projectKey === "bb" ? "Unable to update RFO." : "Unable to update punch points."))
    } finally {
      setSavingRfo(false)
    }
  }

  async function closeTicket() {
    setClosing(true)
    setError("")
    try {
      await api.patch(`/tickets/${ticketId}/close`, {
        closing_date: closingDate,
        closing_time: projectKey === "bb" ? uiToTimeString(closingTime) : undefined,
        punch_point_ids: selectedPunchPointIds,
      })
      setShowCloseModal(false)
      safeLoad()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to close ticket.")
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading ticket...</div>
  if (error && !ticket) return <div className="p-6 text-red-600">{error}</div>
  if (!ticket) return <div className="p-6 text-jscolors-text/50">Ticket not found.</div>

  const isOpen = !ticket.closing_date
  const issueLabel = ticketIssueLabel(projectKey)
  const emptyIssueLabel = projectKey === "bb" ? "No RFO added yet." : "No punch points yet."
  const addIssuePlaceholder = ticketIssuePlaceholder(projectKey)
  const punchPointLabel = ticket.punch_points?.length ? ticket.punch_points.map((point) => point.label).join(", ") : "Not selected"

  return (
    <DetailPageLayout
      backHref="/tickets"
      title={ticket.ticket_number ?? `TKT-${ticket.id}`}
      subtitle="Ticket"
      badges={
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {isOpen ? "Open" : "Closed"}
        </span>
      }
      actions={
        isOpen && can("ticket", "write") ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={savingRfo}
              onClick={() => {
                setSelectedPunchPointIds((ticket.punch_points ?? []).map((point) => point.id))
                setShowEditModal(true)
                setError("")
              }}
            >
              {projectKey === "bb" ? "Edit RFO" : "Edit Punch Points"}
            </Button>
            <Button
              type="button"
              disabled={closing}
              onClick={() => {
                setClosingDate(TODAY)
                setClosingTime(timeStringToUi(ticket.closing_time))
                setSelectedPunchPointIds((ticket.punch_points ?? []).map((point) => point.id))
                setShowCloseModal(true)
                setError("")
              }}
            >
              {closing ? "Closing..." : "Close Ticket"}
            </Button>
          </div>
        ) : null
      }
    >
      <Modal
        isOpen={showEditModal}
        title={`Ticket ${issueLabel}`}
        onClose={() => setShowEditModal(false)}
        size="md"
        submitLabel="Save"
        onSubmit={() => void savePunchPoints()}
        isSubmitting={savingRfo}
      >
        <div className="space-y-4">
          <PunchPointField
            points={punchPoints}
            selectedIds={selectedPunchPointIds}
            onToggle={(pointId) => setSelectedPunchPointIds((current) => toggleSelection(current, pointId))}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            adding={false}
            issueLabel={issueLabel}
            emptyLabel={emptyIssueLabel}
            addPlaceholder={addIssuePlaceholder}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={showCloseModal}
        title="Close Ticket"
        onClose={() => setShowCloseModal(false)}
        size="md"
        submitLabel="Close Ticket"
        onSubmit={() => void closeTicket()}
        isSubmitting={closing}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Closing Date *</span>
            <input
              type="date"
              value={closingDate}
              onChange={(event) => setClosingDate(event.target.value)}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              max={TODAY}
            />
          </label>
          {projectKey === "bb" ? (
            <TimeField
              label="Closing Time"
              value={closingTime}
              onChange={setClosingTime}
            />
          ) : null}
          <PunchPointField
            points={punchPoints}
            selectedIds={selectedPunchPointIds}
            onToggle={(pointId) => setSelectedPunchPointIds((current) => toggleSelection(current, pointId))}
            addLabel={newPunchPointLabel}
            setAddLabel={setNewPunchPointLabel}
            onAdd={() => void addPunchPoint()}
            adding={false}
            issueLabel={issueLabel}
            emptyLabel={emptyIssueLabel}
            addPlaceholder={addIssuePlaceholder}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <section className="glass-panel p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailFieldCard label="Project" value={projectLabel} />
          <DetailFieldCard label="Site" value={cktId} />
          <DetailFieldCard label="Date" value={`${ticket.ticket_date}${ticket.ticket_time ? ` ${ticket.ticket_time}` : ""}`} />
          <DetailFieldCard label={issueLabel} value={punchPointLabel} />
        </div>
      </section>
    </DetailPageLayout>
  )
}
