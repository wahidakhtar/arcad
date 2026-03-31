import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "../../../lib/api"
import { subscribe } from "../../../hooks/useWebSocket"
import { transactionTypeLabel } from "../transactionDisplay"

export type TxRaw = {
  id: number
  project_id: number
  site_id: number | null
  recipient_id: number | null
  recipient_type_key?: string | null
  recipient_label?: string | null
  user_name?: string | null
  subcon_name?: string | null
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
  project_key: string
  ckt_id: string
  tab_key: "site" | "salaried" | "others"
  type_key: string
  type_label: string
  amount: number | string
  status_id: number
  status_key: string
  status_label: string
  version: number
  site_id: number | null
  recipient_id: number | null
  remarks: string | null
}

export default function useTransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([])
  const [allBadges, setAllBadges] = useState<BadgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; pages: number; total: number; pageSize: number } | null>(null)

  const loadData = useCallback(async function loadData(requestedPage = 1) {
    try {
      const [txResponse, projectsResponse, badgesResponse] = await Promise.all([
        api.get<{ items: TxRaw[]; total: number; page: number; page_size: number; pages: number }>("/transactions", {
          params: { page: requestedPage, page_size: 50 },
        }),
        api.get<ProjectEntry[]>("/projects"),
        api.get<BadgeEntry[]>("/badges"),
      ])

      const { items: allTxs, total, page: responsePage, page_size, pages } = txResponse.data
      setPagination({ page: responsePage, pages, total, pageSize: page_size })
      const transactions: TxRaw[] = allTxs ?? []
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      const fetchedBadges: BadgeEntry[] = Array.isArray(badgesResponse.data) ? badgesResponse.data : []

      setAllBadges(fetchedBadges)

      const projectById = new Map(projects.map((project) => [project.id, project]))
      const badgeById = new Map(fetchedBadges.map((badge) => [badge.id, badge]))

      // Deduplicate (projectKey, siteId) pairs → individual lookups instead of full list per project
      const sitePairs = new Map<string, { projectKey: string; siteId: number }>()
      for (const tx of transactions) {
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
        transactions.map((tx) => {
          const project = projectById.get(tx.project_id)
          const cktKey = project && tx.site_id ? `${project.key}:${tx.site_id}` : ""
          const statusBadge = badgeById.get(tx.status_id)
          const typeBadge = badgeById.get(tx.type_id)

          return {
            id: tx.id,
            recipient_label: tx.recipient_label ?? tx.user_name ?? tx.subcon_name ?? "-",
            project_label: project?.label ?? String(tx.project_id),
            project_key: project?.key ?? "",
            ckt_id: siteMap.get(cktKey) ?? (tx.site_id ? String(tx.site_id) : "-"),
            tab_key: tx.site_id ? "site" : tx.recipient_type_key === "user" || !!tx.user_name ? "salaried" : "others",
            amount: tx.amount,
            type_key: typeBadge?.key ?? "",
            type_label: transactionTypeLabel({
              projectKey: project?.key,
              typeKey: typeBadge?.key,
              defaultLabel: typeBadge?.label,
              siteId: tx.site_id,
              remarks: tx.remarks,
            }),
            status_id: tx.status_id,
            status_key: statusBadge?.key ?? "",
            status_label: statusBadge?.label ?? String(tx.status_id),
            version: tx.version,
            site_id: tx.site_id,
            recipient_id: tx.recipient_id,
            remarks: tx.remarks,
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
    void loadData(page)
  }, [loadData, page])

  // WS subscriptions — refetch on any transaction change + ping sidebar counts
  useEffect(() => {
    function handleTxEvent() {
      void loadData(page)
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
    loading,
    error,
    loadData,
    page,
    setPage,
    pagination,
  }
}
