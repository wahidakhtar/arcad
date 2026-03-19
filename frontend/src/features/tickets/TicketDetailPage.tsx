import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

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

type SiteEntry = {
  id: number
  ckt_id: string
}

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<TicketRaw | null>(null)
  const [projectLabel, setProjectLabel] = useState("")
  const [cktId, setCktId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [closing, setClosing] = useState(false)

  async function load() {
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
          const sitesRes = await api.get<SiteEntry[]>(`/sites/${proj.key}`)
          const sites: SiteEntry[] = Array.isArray(sitesRes.data) ? sitesRes.data : []
          const site = sites.find((s) => s.id === t.site_id)
          setCktId(site?.ckt_id ?? String(t.site_id))
        } catch {
          setCktId(String(t.site_id))
        }
      }
    } catch {
      setError("Unable to load ticket.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [ticketId])

  async function closeTicket() {
    setClosing(true)
    try {
      await api.patch(`/tickets/${ticketId}/close`)
      await load()
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <div className="glass-panel p-6">Loading ticket...</div>
  if (error) return <div className="glass-panel p-6 text-red-700">{error}</div>
  if (!ticket) return <div className="glass-panel p-6">Ticket not found.</div>

  const isOpen = !ticket.closing_date

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Ticket</p>
          <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">
            {ticket.ticket_number ?? `TKT-${ticket.id}`}
          </h1>
        </div>
        <button type="button" className="premium-button-secondary" onClick={() => navigate("/tickets")}>
          ← Back
        </button>
      </div>

      <section className="glass-panel p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoField label="Project" value={projectLabel} />
          <InfoField label="Site" value={cktId} />
          <InfoField label="Date" value={ticket.ticket_date} />
          <InfoField
            label="Status"
            value={
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {isOpen ? "Open" : `Closed ${ticket.closing_date}`}
              </span>
            }
          />
          {ticket.rfo ? <InfoField label="Note / RFO" value={ticket.rfo} /> : null}
        </div>

        {isOpen && (
          <div className="pt-2">
            <button
              type="button"
              className="premium-button"
              disabled={closing}
              onClick={() => void closeTicket()}
            >
              {closing ? "Closing..." : "Close Ticket"}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{label}</div>
      <div className="mt-2 text-sm text-jscolors-text">{value}</div>
    </div>
  )
}
