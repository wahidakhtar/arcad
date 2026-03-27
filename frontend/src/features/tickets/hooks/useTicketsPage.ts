import { useCallback, useEffect, useRef, useState } from "react"

import { subscribe } from "../../../hooks/useWebSocket"
import { api } from "../../../lib/api"

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

type SiteLookup = {
  id: number
  ckt_id: string
}

export type TicketRow = Record<string, unknown> & {
  id: number
  ticket_ref: string
  project_label: string
  ckt_id: string
  ticket_date: string | null
  status: string
}

export default function useTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [ticketsResponse, projectsResponse] = await Promise.all([
        api.get<TicketRaw[]>("/tickets"),
        api.get<ProjectEntry[]>("/projects"),
      ])

      const tickets: TicketRaw[] = ticketsResponse.data ?? []
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      const projectById = new Map(projects.map((p) => [p.id, p]))

      // Only show open tickets — closed ones disappear naturally after WS-triggered refetch
      const openTickets = tickets.filter((t) => !t.closing_date)

      // Deduplicate (projectKey, siteId) pairs → individual lookups instead of full list per project
      const pairs = new Map<string, { projectKey: string; siteId: number }>()
      for (const ticket of openTickets) {
        const proj = projectById.get(ticket.project_id)
        if (proj && ticket.site_id) {
          const key = `${proj.key}:${ticket.site_id}`
          if (!pairs.has(key)) pairs.set(key, { projectKey: proj.key, siteId: ticket.site_id })
        }
      }

      const siteMap = new Map<string, string>()
      await Promise.all(
        [...pairs.entries()].map(async ([key, { projectKey, siteId }]) => {
          try {
            const res = await api.get<SiteLookup>("/sites/lookup", {
              params: { project_key: projectKey, site_id: siteId },
            })
            siteMap.set(key, res.data.ckt_id ?? String(siteId))
          } catch {
            // fall back to raw site_id
          }
        }),
      )

      setRows(
        openTickets.map((ticket) => {
          const proj = projectById.get(ticket.project_id)
          const cktKey = proj ? `${proj.key}:${ticket.site_id}` : ""
          return {
            id: ticket.id,
            ticket_ref: ticket.ticket_number ?? `TKT-${ticket.id}`,
            project_label: proj?.label ?? String(ticket.project_id),
            ckt_id: siteMap.get(cktKey) ?? String(ticket.site_id),
            ticket_date: ticket.ticket_date ?? null,
            status: "Open",
          }
        }),
      )
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to load tickets.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Dedup guard
  const lastRefetchRef = useRef(0)
  const safeLoad = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void loadData()
  }, [loadData])

  // WS subscriptions
  useEffect(() => {
    const unsub1 = subscribe("TICKET_CREATED", () => {
      safeLoad()
      window.dispatchEvent(new Event("refresh-counts"))
    })
    const unsub2 = subscribe("TICKET_CLOSED", () => {
      safeLoad()
      window.dispatchEvent(new Event("refresh-counts"))
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [safeLoad])

  return { rows, loading, error, loadData }
}
