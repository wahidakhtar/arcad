import { useState } from "react"
import BadgeDropdown, { type BadgeOption } from "../../components/ui/BadgeDropdown"
import { api } from "../../lib/api"
import type { Badge, TransactionRow, TransitionRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

export default function SiteTransactionCard({
  row,
  badges,
  reqTransitions,
  canRequestWrite,
  canTransactionWrite,
  cancelBadgeId,
  onUpdate,
}: {
  row: TransactionRow
  badges: Map<number, Badge>
  reqTransitions: TransitionRow[]
  canRequestWrite: boolean
  canTransactionWrite: boolean
  cancelBadgeId: number | undefined
  onUpdate: () => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const [showExecInput, setShowExecInput] = useState(false)
  const [execDate, setExecDate] = useState(TODAY)
  const [pendingExctId, setPendingExctId] = useState<number | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  const [err, setErr] = useState("")

  const currentBadge = badges.get(row.status_id)
  const statusKey = currentBadge?.key ?? ""
  const isReq = statusKey === "req"

  async function handleTransition(toId: number, executionDate?: string) {
    setUpdating(true)
    setErr("")
    try {
      await api.patch(`/transactions/${row.id}/status`, {
        status_id: toId,
        version: row.version,
        execution_date: executionDate ?? null,
      })
      await onUpdate()
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 409) {
        setErr(detail ?? "Transaction was modified by another user — please refresh")
        await onUpdate()
      } else {
        setErr(detail ?? "Failed to update transaction.")
      }
    } finally {
      setUpdating(false)
    }
  }

  const dropdownOptions: BadgeOption[] = []
  if (isReq && canTransactionWrite) {
    for (const t of reqTransitions) {
      dropdownOptions.push({ id: t.to_id, label: t.to_label, color: badges.get(t.to_id)?.color ?? null })
    }
  }

  function handleDropdownSelect(toId: number) {
    const badge = badges.get(toId)
    if (badge?.key === "exct") {
      setPendingExctId(toId)
      setShowExecInput(true)
    } else {
      void handleTransition(toId)
    }
  }

  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      {err ? <p className="mb-2 text-xs text-red-600">{err}</p> : null}

      {showCancelConfirm ? (
        <div className="space-y-3">
          <p className="text-sm text-jscolors-text/70">Cancel this transaction?</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="premium-button"
              disabled={updating}
              onClick={() => {
                setShowCancelConfirm(false)
                if (pendingCancelId !== null) void handleTransition(pendingCancelId)
              }}
            >
              Confirm
            </button>
            <button type="button" className="premium-button-secondary" onClick={() => setShowCancelConfirm(false)}>Back</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold text-jscolors-text">{badges.get(row.type_id)?.label ?? "Transaction"} • {row.amount}</div>
              <div className="mt-1 text-sm text-jscolors-text/60">
                {row.request_date}
                {row.bucket_key ? ` • ${row.bucket_key.toUpperCase()}` : ""}
                {row.remarks ? ` • ${row.remarks}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BadgeDropdown
                badge={currentBadge ?? null}
                fallback={statusKey || "-"}
                options={dropdownOptions}
                onSelect={handleDropdownSelect}
                disabled={updating}
              />
              {isReq && canRequestWrite && (
                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 transition hover:bg-red-100"
                  onClick={() => {
                    setPendingCancelId(cancelBadgeId ?? null)
                    setShowCancelConfirm(true)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {showExecInput ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={execDate}
                onChange={(e) => setExecDate(e.target.value)}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-2 text-sm outline-none"
              />
              <button
                type="button"
                className="premium-button"
                disabled={updating}
                onClick={() => {
                  if (pendingExctId === null) return
                  setShowExecInput(false)
                  void handleTransition(pendingExctId, execDate)
                }}
              >
                Confirm Execution
              </button>
              <button type="button" className="premium-button-secondary" onClick={() => setShowExecInput(false)}>Back</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
