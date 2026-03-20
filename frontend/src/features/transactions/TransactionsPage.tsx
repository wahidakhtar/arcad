import { useEffect, useState } from "react"

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
  cancelled: boolean
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
  status_label: string
  cancelled: boolean
  version: number
  cancelled_badge_color: string | null
}

type ExecModal = {
  open: boolean
  transaction_id: number
  to_id: number
  execution_date: string
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function TransactionsPage() {
  const { tags, roles } = useAuth()
  const canWriteTransaction = tags.transaction?.write === true
  const canCancel = roles.some(
    (r) =>
      (r.dept_key === "mgmt" && r.level_key === "l3") ||
      (r.dept_key === "ops" && (r.level_key === "l2" || r.level_key === "l3")),
  )
  const [rows, setRows] = useState<TxRow[]>([])
  const [transitions, setTransitions] = useState<TransitionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [execModal, setExecModal] = useState<ExecModal>({ open: false, transaction_id: 0, to_id: 0, execution_date: TODAY })
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
      const allBadges: BadgeEntry[] = Array.isArray(badgesResponse.data) ? badgesResponse.data : []

      // Fetch transitions independently
      api.get<TransitionEntry[]>("/transactions/transitions").then((res) => {
        setTransitions(Array.isArray(res.data) ? res.data : [])
      }).catch(() => {})

      const projectById = new Map(projects.map((p) => [p.id, p]))
      const badgeById = new Map(allBadges.map((b) => [b.id, b]))
      const cancelBadge = allBadges.find((b) => b.key === "cancel")

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
          status_label: badge?.label ?? String(tx.status_id),
          cancelled: tx.cancelled,
          version: tx.version,
          cancelled_badge_color: cancelBadge?.color ?? null,
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

  async function applyTransition(txId: number, toId: number, executionDate?: string) {
    setTransitioning(txId)
    try {
      await api.patch(`/transactions/${txId}/status`, {
        status_id: toId,
        execution_date: executionDate ?? null,
      })
      await loadData()
    } finally {
      setTransitioning(null)
    }
  }

  async function doCancel(txId: number, version: number) {
    setCancelError("")
    try {
      await api.delete(`/transactions/${txId}`, { data: { version } })
      setConfirmCancel({ open: false, txId: 0, version: 0 })
      await loadData()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        setCancelError(detail ?? "Transaction was modified by another user — please refresh and try again")
        await loadData()
      } else {
        setCancelError(detail ?? "Failed to cancel transaction.")
      }
    }
  }

  function handleTransitionSelect(txId: number, _statusId: number, toId: number, toKey: string) {
    if (toKey === "exct") {
      setExecModal({ open: true, transaction_id: txId, to_id: toId, execution_date: TODAY })
    } else {
      void applyTransition(txId, toId)
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
              const { transaction_id, to_id, execution_date } = execModal
              setExecModal((m) => ({ ...m, open: false }))
              void applyTransition(transaction_id, to_id, execution_date)
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
          <p className="text-sm text-jscolors-text/70">Are you sure you want to cancel this transaction? This cannot be undone.</p>
          {cancelError ? <p className="text-sm text-red-600">{cancelError}</p> : null}
          <button
            type="button"
            className="premium-button w-full"
            onClick={() => void doCancel(confirmCancel.txId, confirmCancel.version)}
          >
            Confirm Cancel
          </button>
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
              if (txRow.cancelled) {
                return (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={txRow.cancelled_badge_color ? { backgroundColor: txRow.cancelled_badge_color + "22", color: txRow.cancelled_badge_color } : {}}
                  >
                    Cancelled
                  </span>
                )
              }
              if (!canWriteTransaction) {
                return <span className="text-sm">{txRow.status_label}</span>
              }
              // Filter out "cancel" transition — cancellation is only via the Cancel button
              const availableTransitions = transitions.filter(
                (t) => t.from_id === txRow.status_id && t.to_key !== "cancel",
              )
              if (!availableTransitions.length || transitioning === txRow.id) {
                return <span className="text-sm">{txRow.status_label}</span>
              }
              return (
                <select
                  value=""
                  onChange={(e) => {
                    const toId = Number(e.target.value)
                    const transition = availableTransitions.find((t) => t.to_id === toId)
                    if (!transition) return
                    handleTransitionSelect(txRow.id, txRow.status_id, toId, transition.to_key)
                    e.target.value = ""
                  }}
                  className="rounded-xl border border-jscolors-crimson/15 bg-white px-2 py-1 text-sm outline-none"
                >
                  <option value="">{txRow.status_label}</option>
                  {availableTransitions.map((t) => (
                    <option key={t.to_id} value={t.to_id}>{t.to_label}</option>
                  ))}
                </select>
              )
            },
          },
          {
            key: "id",
            label: "",
            render: (_value, row) => {
              const txRow = row as unknown as TxRow
              if (txRow.cancelled) return null
              if (!canCancel) return null
              // Only show Cancel for "req" status rows (transitions exist from req)
              const hasReqTransition = transitions.some((t) => t.from_id === txRow.status_id)
              if (!hasReqTransition) return null
              return (
                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 transition hover:bg-red-100"
                  onClick={() => setConfirmCancel({ open: true, txId: txRow.id, version: txRow.version })}
                >
                  Cancel
                </button>
              )
            },
          },
        ]}
        rows={rows as unknown as Record<string, unknown>[]}
        getRowClassName={(row) => {
          const txRow = row as unknown as TxRow
          return txRow.cancelled ? "opacity-50 bg-gray-50" : ""
        }}
      />
    </div>
  )
}
