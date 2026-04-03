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
  active: boolean
  recurring: boolean
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
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; pages: number; total: number; pageSize: number } | null>(null)

  const loadData = useCallback(async (requestedPage = 1) => {
    setLoading(true)
    setError("")
    try {
      const [ticketsResponse, projectsResponse] = await Promise.all([
        api.get<{ items: TicketRaw[]; total: number; page: number; page_size: number; pages: number }>("/tickets", {
          params: { page: requestedPage, page_size: 50 },
        }),
        api.get<ProjectEntry[]>("/me/projects"),
      ])

      const { items: allTickets, total, page: responsePage, page_size, pages } = ticketsResponse.data
      setPagination({ page: responsePage, pages, total, pageSize: page_size })
      const tickets: TicketRaw[] = allTickets ?? []
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      const projectById = new Map(projects.map((p) => [p.id, p]))

      const openTickets = tickets.filter((t) => !t.closing_date)

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
    void loadData(page)
  }, [loadData, page])

  // Dedup guard
  const lastRefetchRef = useRef(0)
  const safeLoad = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void loadData(page)
  }, [loadData, page])

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

  return { rows, loading, error, loadData, page, setPage, pagination }
}
