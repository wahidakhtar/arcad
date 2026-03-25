import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "../../../lib/api"

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
      const projectKeysNeeded = new Set<string>()

      for (const tx of transactions) {
        const project = projectById.get(tx.project_id)
        if (project) {
          projectKeysNeeded.add(project.key)
        }
      }

      const siteMap = new Map<string, string>()
      await Promise.all(
        [...projectKeysNeeded].map(async (projectKey) => {
          try {
            const response = await api.get<SiteEntry[]>(`/sites/${projectKey}`)
            const sites: SiteEntry[] = Array.isArray(response.data) ? response.data : []
            for (const site of sites) {
              siteMap.set(`${projectKey}:${site.id}`, site.ckt_id ?? String(site.id))
            }
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
