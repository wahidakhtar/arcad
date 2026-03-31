import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { api } from "../../../lib/api"
import { subscribe } from "../../../hooks/useWebSocket"
import type { BadgeEntry, TransitionEntry, TxRaw } from "./useTransactionsPage"

export default function useTransactionDetail() {
  const { transactionId = "0" } = useParams()
  const [tx, setTx] = useState<TxRaw | null>(null)
  const [allBadges, setAllBadges] = useState<BadgeEntry[]>([])
  const [transitions, setTransitions] = useState<TransitionEntry[]>([])
  const [cktId, setCktId] = useState<string | null>(null)
  const [projectLabel, setProjectLabel] = useState<string | null>(null)
  const [projectKey, setProjectKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setError("")
    try {
      const [txRes, badgesRes, transitionsRes] = await Promise.all([
        api.get<TxRaw & { recipient_label?: string | null }>(`/transactions/${transactionId}`),
        api.get<BadgeEntry[]>("/badges"),
        api.get<TransitionEntry[]>("/transactions/transitions"),
      ])
      const txData = txRes.data
      setTx({
        ...txData,
        recipient_label: txData.recipient_label ?? txData.user_name ?? txData.subcon_name ?? null,
      })
      setAllBadges(Array.isArray(badgesRes.data) ? badgesRes.data : [])
      setTransitions(Array.isArray(transitionsRes.data) ? transitionsRes.data : [])

      // Load project label + site ckt_id in parallel
      const [projectsRes] = await Promise.all([
        api.get<Array<{ id: number; label: string; key: string }>>("/projects"),
      ])
      const project = projectsRes.data.find((p) => p.id === txData.project_id)
      setProjectLabel(project?.label ?? null)
      setProjectKey(project?.key ?? null)

      if (project && txData.site_id) {
        try {
          const siteRes = await api.get<{ ckt_id: string }>("/sites/lookup", {
            params: { project_key: project.key, site_id: txData.site_id },
          })
          setCktId(siteRes.data.ckt_id)
        } catch {
          setCktId(String(txData.site_id))
        }
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to load transaction.")
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const unsub = subscribe("TRANSACTION_UPDATED", (e) => {
      if ((e as { transaction_id: number }).transaction_id === Number(transactionId)) void loadData()
    })
    return unsub
  }, [transactionId, loadData])

  const badgeById = useMemo(() => new Map(allBadges.map((b) => [b.id, b])), [allBadges])
  const cancelBadgeId = useMemo(() => allBadges.find((b) => b.key === "cancel")?.id ?? null, [allBadges])

  return {
    tx,
    badgeById,
    transitions,
    cancelBadgeId,
    cktId,
    projectLabel,
    projectKey,
    loading,
    error,
    loadData,
  }
}
