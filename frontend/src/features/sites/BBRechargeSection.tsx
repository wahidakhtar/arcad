import { useMemo, useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import SelectInput from "../../components/ui/SelectInput"
import { api } from "../../lib/api"
import { formatCurrency, formatDate } from "../../utils/format"
import type { Badge, RechargeRow, TransactionRow, TransitionRow } from "./siteDetailTypes"
import SiteTransactionCard from "./SiteTransactionCard"
import { transitionOptions } from "./siteDetailHelpers"

function ActionPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function BBRechargeSection({
  siteId,
  projectId,
  recharges,
  transactions,
  transactionTypes,
  badgeById,
  transitions,
  reqBadgeId,
  cancelBadgeId,
  canRequestWrite,
  canTransactionWrite,
  statusKey,
  onReload,
}: {
  siteId: number
  projectId?: number
  recharges: RechargeRow[]
  transactions: TransactionRow[]
  transactionTypes: Badge[]
  badgeById: Map<number, Badge>
  transitions: TransitionRow[]
  reqBadgeId: number | undefined
  cancelBadgeId: number | undefined
  canRequestWrite: boolean
  canTransactionWrite: boolean
  statusKey: string
  onReload: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [validity, setValidity] = useState("")
  const [uom, setUom] = useState("days")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState("")

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)
  const rechargeTypeId = transactionTypes.find((type) => type.key === "rec")?.id
  const rechargeTransactions = useMemo(
    () => transactions.filter((transaction) => badgeById.get(transaction.type_id)?.key === "rec"),
    [badgeById, transactions],
  )

  async function submitRequest() {
    if (!projectId || !rechargeTypeId) {
      setErr("Recharge transaction type is not configured.")
      return
    }
    setSubmitting(true)
    setErr("")
    try {
      await api.post("/transactions", {
        project_id: projectId,
        site_id: siteId,
        amount: Number(amount),
        type_id: rechargeTypeId,
        remarks: `Recharge request • ${Number(validity)} ${uom}`,
        recharge_validity: Number(validity),
        recharge_uom: uom,
      })
      setOpen(false)
      setAmount("")
      setValidity("")
      setUom("days")
      await onReload()
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(detail ?? "Failed to request recharge.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={open}
        title="Request Recharge"
        onClose={() => { setOpen(false); setErr("") }}
        size="sm"
        submitLabel="Submit Request"
        onSubmit={() => void submitRequest()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Amount *</span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Validity *</span>
            <input
              type="number"
              value={validity}
              onChange={(event) => setValidity(event.target.value)}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Unit *</span>
            <SelectInput value={uom} onChange={(event) => setUom(event.target.value)}>
              <option value="days">Days</option>
              <option value="months">Months</option>
            </SelectInput>
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </Modal>

      <ActionPanel
        title="Recharges"
        action={canRequestWrite ? <Button type="button" disabled={statusKey === "term"} onClick={() => setOpen(true)}>Request Recharge</Button> : undefined}
      >
        <div className="space-y-3">
          {rechargeTransactions.length ? rechargeTransactions.map((transaction) => (
            <SiteTransactionCard
              key={transaction.id}
              row={transaction}
              badges={badgeById}
              reqTransitions={reqTransitions}
              canRequestWrite={canRequestWrite}
              canTransactionWrite={canTransactionWrite}
              cancelBadgeId={cancelBadgeId}
              onUpdate={onReload}
            />
          )) : null}
          {recharges.length ? recharges.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-semibold text-jscolors-text">{formatCurrency(row.amount)}</div>
                <div className="text-sm text-jscolors-text/60">
                  {formatDate(row.date)} • {row.validity} {row.uom}
                  {row.next_recharge_date ? ` • Next ${formatDate(row.next_recharge_date)}` : ""}
                </div>
              </div>
            </div>
          )) : null}
          {!rechargeTransactions.length && !recharges.length ? <EmptyState text="No recharges yet" /> : null}
        </div>
      </ActionPanel>
    </>
  )
}
