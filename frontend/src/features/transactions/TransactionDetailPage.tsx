import { useState } from "react"

import Button from "../../components/ui/Button"
import DetailFieldCard from "../../components/ui/DetailFieldCard"
import DetailPageLayout from "../../components/layout/DetailPageLayout"
import ExecutionDateModal from "../../components/ui/ExecutionDateModal"
import FieldRenderer from "../../components/ui/FieldRenderer"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import { formatCurrency } from "../../utils/format"
import { txStatusLabel } from "../sites/siteDetailHelpers"
import { updateTransactionStatus } from "../../services/transactionService"
import useTransactionDetail from "./hooks/useTransactionDetail"

export default function TransactionDetailPage() {
  const { can } = useAuth()
  const canTransactionWrite = can("transaction", "write")
  const canRequestWrite = can("request", "write")

  const { tx, badgeById, transitions, cancelBadgeId, cktId, projectLabel, loading, error, loadData } =
    useTransactionDetail()

  const [transitioning, setTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState("")
  const [execModal, setExecModal] = useState({ open: false, toId: 0, title: "Execution Date" })
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState("")

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading transaction...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!tx) return <div className="p-6 text-jscolors-text/50">Transaction not found.</div>

  const statusBadge = badgeById.get(tx.status_id)
  const typeBadge = badgeById.get(tx.type_id)
  const isReq = statusBadge?.key === "requested" || statusBadge?.key === "req"
  const availableTransitions = transitions.filter((t) => t.from_id === tx.status_id)
  const displayStatusLabel = txStatusLabel(typeBadge?.key ?? "", statusBadge?.key ?? "", statusBadge?.label ?? "")

  async function applyTransition(toId: number, executionDate?: string) {
    if (!tx) return
    setTransitioning(true)
    setTransitionError("")
    try {
      await updateTransactionStatus(tx.id, {
        status_id: toId,
        version: tx.version,
        execution_date: executionDate ?? null,
      })
      await loadData()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTransitionError(detail ?? "Action failed.")
      await loadData()
    } finally {
      setTransitioning(false)
    }
  }

  async function doCancel() {
    if (!tx || !cancelBadgeId) return
    setCancelError("")
    setTransitioning(true)
    try {
      await updateTransactionStatus(tx.id, { status_id: cancelBadgeId, version: tx.version })
      setConfirmCancel(false)
      await loadData()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setCancelError(detail ?? "Failed to cancel.")
    } finally {
      setTransitioning(false)
    }
  }

  return (
    <DetailPageLayout
      backHref="/transactions"
      subtitle="Transaction"
      title={tx.recipient_label ?? `#${tx.id}`}
      badges={
        <div className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">Status</div>
          <div className="mt-2">
            <FieldRenderer type="badge" value={{ label: displayStatusLabel, color: statusBadge?.color ?? null }} />
          </div>
        </div>
      }
    >
      <ExecutionDateModal
        open={execModal.open}
        title={execModal.title}
        submitting={transitioning}
        onConfirm={(date) => {
          setExecModal((m) => ({ ...m, open: false }))
          void applyTransition(execModal.toId, date)
        }}
        onClose={() => setExecModal((m) => ({ ...m, open: false }))}
      />

      <Modal
        open={confirmCancel}
        title="Cancel Transaction"
        onClose={() => { setConfirmCancel(false); setCancelError("") }}
      >
        <div className="space-y-4">
          <p className="text-sm text-jscolors-text/70">Cancel this transaction?</p>
          {cancelError ? <p className="text-sm text-red-600">{cancelError}</p> : null}
          <div className="flex gap-3">
            <Button type="button" className="flex-1" disabled={transitioning} onClick={() => void doCancel()}>
              Confirm
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setConfirmCancel(false); setCancelError("") }}
            >
              Back
            </Button>
          </div>
        </div>
      </Modal>

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <DetailFieldCard label="Type" value={<FieldRenderer value={typeBadge?.label ?? "-"} />} />
          <DetailFieldCard label="Project" value={<FieldRenderer value={projectLabel ?? "-"} />} />
          <DetailFieldCard label="Site" value={<FieldRenderer value={cktId ?? "-"} />} />
          <DetailFieldCard
            label="Amount"
            value={<span className="text-base font-semibold text-jscolors-crimson">{formatCurrency(tx.amount as number)}</span>}
          />
          <DetailFieldCard label="Request Date" value={<FieldRenderer value={tx.request_date} />} />
          {tx.execution_date ? (
            <DetailFieldCard label="Execution Date" value={<FieldRenderer value={tx.execution_date} />} />
          ) : null}
          {tx.remarks ? (
            <DetailFieldCard label="Remarks" value={<FieldRenderer value={tx.remarks} />} />
          ) : null}
        </div>
      </section>

      {isReq && (canTransactionWrite || canRequestWrite) ? (
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Actions</p>
          {transitionError ? (
            <p className="mt-3 text-sm text-red-600">{transitionError}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {canTransactionWrite && availableTransitions.map((t) => {
              const _toBadge = badgeById.get(t.to_id)
              const label = t.to_key === "exct"
                ? txStatusLabel(typeBadge?.key ?? "", "exct", t.to_label)
                : t.to_label
              return (
                <Button
                  key={t.to_id}
                  type="button"
                  disabled={transitioning}
                  onClick={() => {
                    if (t.to_key === "exct" && typeBadge?.key !== "b_sur" && typeBadge?.key !== "e_sur") {
                      setExecModal({
                        open: true,
                        toId: t.to_id,
                        title: typeBadge?.key === "ref" ? "Refund Date" : "Execution Date",
                      })
                    } else {
                      void applyTransition(t.to_id)
                    }
                  }}
                >
                  {label}
                </Button>
              )
            })}
            {canRequestWrite ? (
              <Button
                type="button"
                variant="danger"
                disabled={transitioning}
                onClick={() => setConfirmCancel(true)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </DetailPageLayout>
  )
}
