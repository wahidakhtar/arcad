import { useEffect, useState } from "react"

import BadgeDropdown from "../../components/ui/BadgeDropdown"
import type { BadgeOption } from "../../components/ui/BadgeDropdown"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type TxRaw = {
  id: number
  project_id: number
  site_id: number | null
  recipient_id: number | null
  bucket_key: string | null
  type_id: number
  amount: number | string
  status_id: number
  request_date: string
  execution_date: string | null
  remarks: string | null
  version: number
}

type ProjectEntry = {
  id: number
  key: string
  label: string
}

type BadgeEntry = {
  id: number
  key: string
  label: string
  color: string | null
}

type SiteEntry = {
  id: number
  ckt_id: string
}

type TransitionEntry = {
  from_id: number
  from_key: string
  to_id: number
  to_key: string
  to_label: string
}

type TxRow = {
  id: number
  project_label: string
  ckt_id: string
  amount: number | string
  status_id: number
  status_key: string
  status_label: string
  version: number
}

type ExecModal = {
  open: boolean
  transaction_id: number
  to_id: number
  version: number
  execution_date: string
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function TransactionsPage() {
  const { tags } = useAuth()
  const canRequestWrite = tags.request?.write === true
  const canTransactionWrite = tags.transaction?.write === true

  const [rows, setRows] = useState<TxRow[]>([])
  const [allBadges, setAllBadges] = useState<BadgeEntry[]>([])
  const [transitions, setTransitions] = useState<TransitionEntry[]>([])
  const [cancelBadgeId, setCancelBadgeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [transitionError, setTransitionError] = useState("")
  const [execModal, setExecModal] = useState<ExecModal>({ open: false, transaction_id: 0, to_id: 0, version: 0, execution_date: TODAY })
  const [transitioning, setTransitioning] = useState<number | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; txId: number; version: number }>({ open: false, txId: 0, version: 0 })
  const [cancelError, setCancelError] = useState("")

  async function loadData() {
    try {
      const [txResponse, projectsResponse, badgesResponse] = await Promise.all([
        api.get<TxRaw[]>("/transactions"),
        api.get<ProjectEntry[]>("/projects"),
        api.get<BadgeEntry[]>("/badges"),
      ])

      const transactions: TxRaw[] = txResponse.data ?? []
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      const fetchedBadges: BadgeEntry[] = Array.isArray(badgesResponse.data) ? badgesResponse.data : []

      api.get<TransitionEntry[]>("/transactions/transitions").then((res) => {
        setTransitions(Array.isArray(res.data) ? res.data : [])
      }).catch(() => {})

      setAllBadges(fetchedBadges)
      const cancelBadge = fetchedBadges.find((b) => b.key === "cancel")
      setCancelBadgeId(cancelBadge?.id ?? null)

      const projectById = new Map(projects.map((p) => [p.id, p]))
      const badgeById = new Map(fetchedBadges.map((b) => [b.id, b]))

      const projectKeysNeeded = new Set<string>()
      for (const tx of transactions) {
        const proj = projectById.get(tx.project_id)
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
            // fall back to raw site_id
          }
        }),
      )

      const displayRows: TxRow[] = transactions.map((tx) => {
        const proj = projectById.get(tx.project_id)
        const cktKey = proj && tx.site_id ? `${proj.key}:${tx.site_id}` : ""
        const badge = badgeById.get(tx.status_id)
        return {
          id: tx.id,
          project_label: proj?.label ?? String(tx.project_id),
          ckt_id: siteMap.get(cktKey) ?? (tx.site_id ? String(tx.site_id) : "-"),
          amount: tx.amount,
          status_id: tx.status_id,
          status_key: badge?.key ?? "",
          status_label: badge?.label ?? String(tx.status_id),
          version: tx.version,
        }
      })

      setRows(displayRows)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to load transactions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function applyTransition(txId: number, toId: number, version: number, executionDate?: string) {
    setTransitioning(txId)
    setTransitionError("")
    try {
      await api.patch(`/transactions/${txId}/status`, {
        status_id: toId,
        version,
        execution_date: executionDate ?? null,
      })
      await loadData()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 409) {
        setTransitionError(detail ?? "Transaction was modified by another user — please refresh")
        await loadData()
      }
    } finally {
      setTransitioning(null)
    }
  }

  async function doCancel(txId: number, version: number) {
    if (!cancelBadgeId) return
    setCancelError("")
    try {
      await api.patch(`/transactions/${txId}/status`, { status_id: cancelBadgeId, version })
      setConfirmCancel({ open: false, txId: 0, version: 0 })
      await loadData()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 409) {
        setCancelError(detail ?? "Transaction was modified by another user — please refresh")
        await loadData()
      } else {
        setCancelError(detail ?? "Failed to cancel transaction.")
      }
    }
  }

  if (loading) {
    return <div className="glass-panel p-6">Loading transactions...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Transactions</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Requested, executed, cancelled, and rejected finance flow</h1>
      </div>

      {transitionError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{transitionError}</p>
      ) : null}

      <Modal
        open={execModal.open}
        title="Set Execution Date"
        onClose={() => setExecModal((m) => ({ ...m, open: false }))}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Execution Date</span>
            <input
              type="date"
              value={execModal.execution_date}
              onChange={(e) => setExecModal((m) => ({ ...m, execution_date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            className="premium-button w-full"
            disabled={transitioning === execModal.transaction_id}
            onClick={() => {
              const { transaction_id, to_id, version, execution_date } = execModal
              setExecModal((m) => ({ ...m, open: false }))
              void applyTransition(transaction_id, to_id, version, execution_date)
            }}
          >
            Confirm Execution
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmCancel.open}
        title="Cancel Transaction"
        onClose={() => { setConfirmCancel({ open: false, txId: 0, version: 0 }); setCancelError("") }}
      >
        <div className="space-y-4">
          <p className="text-sm text-jscolors-text/70">Cancel this transaction?</p>
          {cancelError ? <p className="text-sm text-red-600">{cancelError}</p> : null}
          <div className="flex gap-3">
            <button
              type="button"
              className="premium-button flex-1"
              onClick={() => void doCancel(confirmCancel.txId, confirmCancel.version)}
            >
              Confirm
            </button>
            <button
              type="button"
              className="premium-button-secondary flex-1"
              onClick={() => { setConfirmCancel({ open: false, txId: 0, version: 0 }); setCancelError("") }}
            >
              Back
            </button>
          </div>
        </div>
      </Modal>

      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "project_label", label: "Project" },
          { key: "ckt_id", label: "Site" },
          { key: "amount", label: "Amount" },
          {
            key: "status_label",
            label: "Status",
            render: (_value, row) => {
              const txRow = row as unknown as TxRow
              const isReq = txRow.status_key === "req"
              const badgeById = new Map(allBadges.map((b) => [b.id, b]))
              const currentBadgeEntry = badgeById.get(txRow.status_id)
              const currentBadge = { label: txRow.status_label, color: currentBadgeEntry?.color ?? null }

              // Dropdown options sourced exclusively from badge_transitions (req→exct, req→rej only)
              const options: BadgeOption[] = []
              if (isReq && canTransactionWrite) {
                for (const t of transitions.filter((tr) => tr.from_id === txRow.status_id)) {
                  const badgeEntry = badgeById.get(t.to_id)
                  options.push({ id: t.to_id, label: t.to_label, color: badgeEntry?.color ?? null })
                }
              }

              function handleSelect(toId: number) {
                const entry = badgeById.get(toId)
                if (entry?.key === "exct") {
                  setExecModal({ open: true, transaction_id: txRow.id, to_id: toId, version: txRow.version, execution_date: TODAY })
                } else {
                  void applyTransition(txRow.id, toId, txRow.version)
                }
              }

              return (
                <div className="flex items-center gap-2">
                  <BadgeDropdown
                    badge={currentBadge}
                    options={options}
                    onSelect={handleSelect}
                    disabled={transitioning === txRow.id}
                  />
                  {isReq && canRequestWrite && (
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 transition hover:bg-red-100"
                      onClick={() => setConfirmCancel({ open: true, txId: txRow.id, version: txRow.version })}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )
            },
          },
        ]}
        rows={rows as unknown as Record<string, unknown>[]}
      />
    </div>
  )
}
