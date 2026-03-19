import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import { api } from "../../lib/api"

type TicketRaw = {
  id: number
  project_id: number
  site_id: number
  ticket_number?: string | null
  ticket_date?: string | null
  closing_date?: string | null
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

type TicketRow = Record<string, unknown> & {
  id: number
  ticket_ref: string
  project_label: string
  ckt_id: string
  ticket_date: string | null
  status: string
}

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [ticketsResponse, projectsResponse] = await Promise.all([
          api.get<TicketRaw[]>("/tickets"),
          api.get<ProjectEntry[]>("/projects"),
        ])

        if (cancelled) return

        const tickets: TicketRaw[] = ticketsResponse.data ?? []
        const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []

        const projectById = new Map(projects.map((p) => [p.id, p]))

        const projectKeysNeeded = new Set<string>()
        for (const ticket of tickets) {
          const proj = projectById.get(ticket.project_id)
          if (proj) projectKeysNeeded.add(proj.key)
        }

        const siteMap = new Map<string, string>()
        await Promise.all(
          [...projectKeysNeeded].map(async (key) => {
            try {
              const res = await api.get<SiteEntry[]>(`/sites/${key}`)
              const sites: SiteEntry[] = Array.isArray(res.data) ? res.data : []
              for (const site of sites) {
                siteMap.set(`${key}:${site.id}`, site.ckt_id ?? String(site.id))
              }
            } catch {
              // fall back to raw site_id for this project
            }
          }),
        )

        if (cancelled) return

        const displayRows: TicketRow[] = tickets.map((ticket) => {
          const proj = projectById.get(ticket.project_id)
          const cktKey = proj ? `${proj.key}:${ticket.site_id}` : ""
          return {
            id: ticket.id,
            ticket_ref: ticket.ticket_number ?? `TKT-${ticket.id}`,
            project_label: proj?.label ?? String(ticket.project_id),
            ckt_id: siteMap.get(cktKey) ?? String(ticket.site_id),
            ticket_date: ticket.ticket_date ?? null,
            status: ticket.closing_date ? "Closed" : "Open",
          }
        })

        setRows(displayRows)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail ?? "Unable to load tickets.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="glass-panel p-6">Loading tickets...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Tickets</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Ticket queue across projects</h1>
      </div>
      <DataTable
        columns={[
          {
            key: "ticket_ref",
            label: "Ticket Number",
            render: (_value, row) => (
              <button
                type="button"
                className="text-jscolors-crimson underline-offset-2 hover:underline text-sm"
                onClick={() => navigate(`/tickets/${(row as unknown as TicketRow).id}`)}
              >
                {(row as unknown as TicketRow).ticket_ref}
              </button>
            ),
          },
          { key: "project_label", label: "Project" },
          { key: "ckt_id", label: "Site" },
          { key: "ticket_date", label: "Date" },
          {
            key: "status",
            label: "Status",
            render: (_value, row) => {
              const status = (row as unknown as TicketRow).status
              return (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-green-50 text-green-700"}`}>
                  {status}
                </span>
              )
            },
          },
        ]}
        rows={rows}
      />
    </div>
  )
}
