import { useState } from "react"
import Button from "../../components/ui/Button"
import BadgeDropdown, { type BadgeOption } from "../../components/ui/BadgeDropdown"
import ConfirmCancelTransactionModal from "../../components/ui/ConfirmCancelTransactionModal"
import ExecutionDateModal from "../../components/ui/ExecutionDateModal"
import { api } from "../../lib/api"
import { formatCurrency, formatDate } from "../../utils/format"
import type { Badge, TransactionRow, TransitionRow } from "./siteDetailTypes"
import { txStatusLabel } from "./siteDetailHelpers"

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
  const [showExecModal, setShowExecModal] = useState(false)
  const [execModalTitle, setExecModalTitle] = useState("Set Execution Date")
  const [pendingExctId, setPendingExctId] = useState<number | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  const [err, setErr] = useState("")

  const currentBadge = badges.get(row.status_id)
  const statusKey = currentBadge?.key ?? ""
  const isReq = statusKey === "req"
  const typeKey = badges.get(row.type_id)?.key

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
      const optLabel = t.to_key === "exct" ? txStatusLabel(typeKey, "exct", t.to_label) : t.to_label
      dropdownOptions.push({ id: t.to_id, label: optLabel, color: badges.get(t.to_id)?.color ?? null })
    }
  }

  function handleDropdownSelect(toId: number) {
    const badge = badges.get(toId)
    if (badge?.key === "exct") {
      if (typeKey === "b_sur" || typeKey === "e_sur") {
        void handleTransition(toId)
      } else {
        setPendingExctId(toId)
        setExecModalTitle(typeKey === "ref" ? "Refund Date" : "Execution Date")
        setShowExecModal(true)
      }
    } else {
      void handleTransition(toId)
    }
  }

  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <ExecutionDateModal
        open={showExecModal}
        title={execModalTitle}
        submitting={updating}
        onConfirm={(date) => {
          setShowExecModal(false)
          if (pendingExctId !== null) void handleTransition(pendingExctId, date)
        }}
        onClose={() => setShowExecModal(false)}
      />

      <ConfirmCancelTransactionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false)
          if (pendingCancelId !== null) void handleTransition(pendingCancelId)
        }}
        isLoading={updating}
      />

      {err ? <p className="mb-2 text-xs text-red-600">{err}</p> : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold text-jscolors-text">{badges.get(row.type_id)?.label ?? "Transaction"} • {formatCurrency(row.amount)}</div>
          <div className="mt-1 text-sm text-jscolors-text/60">
            {formatDate(row.request_date)}
            {row.bucket_key ? ` • ${row.bucket_key.toUpperCase()}` : ""}
            {row.remarks ? ` • ${row.remarks}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BadgeDropdown
            badge={currentBadge ? { label: txStatusLabel(typeKey, statusKey, currentBadge.label), color: currentBadge.color } : null}
            fallback={statusKey || "-"}
            options={dropdownOptions}
            onSelect={handleDropdownSelect}
            disabled={updating}
          />
          {isReq && canRequestWrite && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="rounded-xl py-1"
              onClick={() => {
                setPendingCancelId(cancelBadgeId ?? null)
                setShowCancelModal(true)
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
