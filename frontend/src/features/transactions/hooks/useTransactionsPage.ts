import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "../../../lib/api"
import { subscribe } from "../../../hooks/useWebSocket"

export type TxRaw = {
  id: number
  project_id: number
  site_id: number | null
  recipient_id: number | null
  recipient_label: string | null
  bucket_key: string | null
  type_id: number
  amount: number | string
  status_id: number
  request_date: string
  execution_date: string | null
  remarks: string | null
  version: number
}

export type ProjectEntry = {
  id: number
  key: string
  label: string
}

export type BadgeEntry = {
  id: number
  key: string
  label: string
  color: string | null
}

type SiteEntry = {
  id: number
  ckt_id: string
}

export type TransitionEntry = {
  from_id: number
  from_key: string
  to_id: number
  to_key: string
  to_label: string
}

export type TxRow = {
  id: number
  recipient_label: string
  project_label: string
  ckt_id: string
  type_key: string
  type_label: string
  amount: number | string
  status_id: number
  status_key: string
  status_label: string
  version: number
}

export default function useTransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([])
  const [allBadges, setAllBadges] = useState<BadgeEntry[]>([])
  const [transitions, setTransitions] = useState<TransitionEntry[]>([])
  const [cancelBadgeId, setCancelBadgeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async function loadData() {
    try {
      const [txResponse, projectsResponse, badgesResponse] = await Promise.all([
        api.get<TxRaw[]>("/transactions"),
        api.get<ProjectEntry[]>("/projects"),
        api.get<BadgeEntry[]>("/badges"),
      ])

      const transactions: TxRaw[] = txResponse.data ?? []
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      const fetchedBadges: BadgeEntry[] = Array.isArray(badgesResponse.data) ? badgesResponse.data : []

      api.get<TransitionEntry[]>("/transactions/transitions").then((response) => {
        setTransitions(Array.isArray(response.data) ? response.data : [])
      }).catch(() => {})

      setAllBadges(fetchedBadges)
      setCancelBadgeId(fetchedBadges.find((badge) => badge.key === "cancel")?.id ?? null)

      const projectById = new Map(projects.map((project) => [project.id, project]))
      const badgeById = new Map(fetchedBadges.map((badge) => [badge.id, badge]))
      // Only show "requested" transactions — others disappear naturally after WS refetch
      const requestedTransactions = transactions.filter((tx) => {
        const badge = badgeById.get(tx.status_id)
        return badge?.key === "requested"
      })

      // Deduplicate (projectKey, siteId) pairs → individual lookups instead of full list per project
      const sitePairs = new Map<string, { projectKey: string; siteId: number }>()
      for (const tx of requestedTransactions) {
        const project = projectById.get(tx.project_id)
        if (project && tx.site_id) {
          const key = `${project.key}:${tx.site_id}`
          if (!sitePairs.has(key)) sitePairs.set(key, { projectKey: project.key, siteId: tx.site_id })
        }
      }

      const siteMap = new Map<string, string>()
      await Promise.all(
        [...sitePairs.entries()].map(async ([key, { projectKey, siteId }]) => {
          try {
            const response = await api.get<SiteEntry>(`/sites/lookup`, {
              params: { project_key: projectKey, site_id: siteId },
            })
            siteMap.set(key, response.data.ckt_id ?? String(siteId))
          } catch {
            // fall back to raw site_id
          }
        }),
      )

      setRows(
        requestedTransactions.map((tx) => {
          const project = projectById.get(tx.project_id)
          const cktKey = project && tx.site_id ? `${project.key}:${tx.site_id}` : ""
          const statusBadge = badgeById.get(tx.status_id)
          const typeBadge = badgeById.get(tx.type_id)

          return {
            id: tx.id,
            recipient_label: tx.recipient_label ?? "-",
            project_label: project?.label ?? String(tx.project_id),
            ckt_id: siteMap.get(cktKey) ?? (tx.site_id ? String(tx.site_id) : "-"),
            amount: tx.amount,
            type_key: typeBadge?.key ?? "",
            type_label: typeBadge?.label ?? "-",
            status_id: tx.status_id,
            status_key: statusBadge?.key ?? "",
            status_label: statusBadge?.label ?? String(tx.status_id),
            version: tx.version,
          }
        }),
      )
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to load transactions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [])

  // WS subscriptions — refetch on any transaction change + ping sidebar counts
  useEffect(() => {
    function handleTxEvent() {
      void loadData()
      window.dispatchEvent(new Event("refresh-counts"))
    }
    const unsub1 = subscribe("TRANSACTION_CREATED", handleTxEvent)
    const unsub2 = subscribe("TRANSACTION_UPDATED", handleTxEvent)
    return () => {
      unsub1()
      unsub2()
    }
  }, [loadData])

  const badgeById = useMemo(() => new Map(allBadges.map((badge) => [badge.id, badge])), [allBadges])

  return {
    rows,
    allBadges,
    badgeById,
    transitions,
    cancelBadgeId,
    loading,
    error,
    loadData,
  }
}
