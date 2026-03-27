import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import DetailFieldCard from "../../components/ui/DetailFieldCard"
import { subscribe } from "../../hooks/useWebSocket"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type TicketRaw = {
  id: number
  project_id: number
  site_id: number
  ticket_number: string | null
  ticket_date: string
  rfo: string | null
  closing_date: string | null
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
  const [cktId, setCktId] = useState("")
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

      const projects: ProjectEntry[] = Array.isArray(projectsRes.data) ? projectsRes.data : []
      const proj = projects.find((p) => p.id === t.project_id)
      setProjectLabel(proj?.label ?? String(t.project_id))

      if (proj) {
        try {
          // Use targeted lookup instead of full site list
          const siteRes = await api.get<SiteLookup>("/sites/lookup", {
            params: { project_key: proj.key, site_id: t.site_id },
          })
          setCktId(siteRes.data.ckt_id ?? String(t.site_id))
        } catch {
          setCktId(String(t.site_id))
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

  // Dedup guard — prevents double-refetch when user closes ticket and WS fires together
  const lastRefetchRef = useRef(0)
  const safeLoad = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void load()
  }, [load])

  // WS subscription — update when this ticket changes
  useEffect(() => {
    const numericTicketId = Number(ticketId)
    const unsub = subscribe("TICKET_CLOSED", (e) => {
      if ((e as { ticket_id: number }).ticket_id === numericTicketId) safeLoad()
    })
    return unsub
  }, [ticketId, safeLoad])

  async function closeTicket() {
    setClosing(true)
    try {
      await api.patch(`/tickets/${ticketId}/close`)
      safeLoad()
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading ticket...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!ticket) return <div className="p-6 text-jscolors-text/50">Ticket not found.</div>

  const isOpen = !ticket.closing_date

  return (
    <DetailPageLayout
      backHref="/tickets"
      title={ticket.ticket_number ?? `TKT-${ticket.id}`}
      subtitle="Ticket"
      actions={
        isOpen && can("ticket", "write") ? (
          <Button type="button" disabled={closing} onClick={() => void closeTicket()}>
            {closing ? "Closing..." : "Close Ticket"}
          </Button>
        ) : null
      }
    >
      <section className="glass-panel p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailFieldCard label="Project" value={projectLabel} />
          <DetailFieldCard label="Site" value={cktId} />
          <DetailFieldCard label="Date" value={ticket.ticket_date} />
          <DetailFieldCard
            label="Status"
            value={
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {isOpen ? "Open" : `Closed ${ticket.closing_date}`}
              </span>
            }
          />
          {ticket.rfo ? <DetailFieldCard label="Note / RFO" value={ticket.rfo} /> : null}
        </div>
      </section>
    </DetailPageLayout>
  )
}
