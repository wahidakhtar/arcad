import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import DetailFieldCard from "../../components/ui/DetailFieldCard"
import Modal from "../../components/ui/Modal"
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
}

type SiteLookup = {
  id: number
  ckt_id: string
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
  const [closingTime, setClosingTime] = useState("")
  const [newPunchPointLabel, setNewPunchPointLabel] = useState("")
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [closing, setClosing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [ticketRes, projectsRes] = await Promise.all([
        api.get<TicketRaw>(`/tickets/${ticketId}`),
        api.get<ProjectEntry[]>("/projects"),
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
      setError("Unable to add punch point.")
    }
  }

  async function closeTicket() {
    setClosing(true)
    setError("")
    try {
      await api.patch(`/tickets/${ticketId}/close`, {
        closing_date: closingDate,
        closing_time: projectKey === "bb" ? closingTime : undefined,
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
  const punchPointLabel = ticket.punch_points?.length ? ticket.punch_points.map((point) => point.label).join(", ") : "Not selected"

  return (
    <DetailPageLayout
      backHref="/tickets"
      title={ticket.ticket_number ?? `TKT-${ticket.id}`}
      subtitle="Ticket"
      actions={
        isOpen && can("ticket", "write") ? (
          <Button
            type="button"
            disabled={closing}
            onClick={() => {
              setClosingDate(TODAY)
              setClosingTime("")
              setSelectedPunchPointIds((ticket.punch_points ?? []).map((point) => point.id))
              setShowCloseModal(true)
              setError("")
            }}
          >
            {closing ? "Closing..." : "Close Ticket"}
          </Button>
        ) : null
      }
    >
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
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Closing Time *</span>
              <input
                type="time"
                value={closingTime}
                onChange={(event) => setClosingTime(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Punch Points</span>
            <select
              multiple
              value={selectedPunchPointIds.map(String)}
              onChange={(event) => setSelectedPunchPointIds(Array.from(event.target.selectedOptions).map((option) => Number(option.value)))}
              className="min-h-32 w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
            >
              {punchPoints.map((point) => (
                <option key={point.id} value={point.id}>{point.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPunchPointLabel}
              onChange={(event) => setNewPunchPointLabel(event.target.value)}
              className="flex-1 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              placeholder="Add new punch point"
            />
            <Button type="button" variant="secondary" onClick={() => void addPunchPoint()} disabled={!newPunchPointLabel.trim()}>
              Add
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Modal>

      <section className="glass-panel p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailFieldCard label="Project" value={projectLabel} />
          <DetailFieldCard label="Site" value={cktId} />
          <DetailFieldCard label="Date" value={`${ticket.ticket_date}${ticket.ticket_time ? ` ${ticket.ticket_time}` : ""}`} />
          <DetailFieldCard label="Punch Points" value={punchPointLabel} />
          <DetailFieldCard
            label="Status"
            value={
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {isOpen ? "Open" : `Closed ${ticket.closing_date}${ticket.closing_time ? ` ${ticket.closing_time}` : ""}`}
              </span>
            }
          />
        </div>
      </section>
    </DetailPageLayout>
  )
}
