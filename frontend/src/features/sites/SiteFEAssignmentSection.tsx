import { useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import { formatCurrency } from "../../utils/format"
import type { Badge, JobBucket, ProjectRow, SiteDetail, SubconRow, TransactionRow, TransitionRow } from "./siteDetailTypes"
import { bucketLabel, transitionOptions } from "./siteDetailHelpers"
import SiteTransactionCard from "./SiteTransactionCard"

type TxModal = { open: boolean; subconId: number; bucketKey: string; subconLabel: string; type_id: string; amount: string; err: string }
type RemoveModal = { open: boolean; assignment_id: number; subcon_label: string; final_cost: string; err: string }
const selectCls = "w-full appearance-none rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 pr-11 text-sm outline-none transition focus:border-jscolors-crimson/40"

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

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectCls}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-jscolors-text/45">
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M4.2 6.1a.75.75 0 0 1 1.06.04L8 9.08l2.74-2.94a.75.75 0 1 1 1.1 1.02l-3.3 3.54a.75.75 0 0 1-1.08 0L4.16 7.16a.75.75 0 0 1 .04-1.06Z" />
          </svg>
        </span>
      </div>
    </label>
  )
}

export default function SiteFEAssignmentSection({
  currentSite,
  projectKey,
  project,
  jobBuckets,
  subcons,
  transactions,
  badgeById,
  transactionTypes,
  transitions,
  reqBadgeId,
  cancelBadgeId,
  canRequestWrite,
  canTransactionWrite,
  canSiteWrite,
  onReload,
}: {
  currentSite: SiteDetail
  projectKey: string
  project: ProjectRow | null
  jobBuckets: JobBucket[]
  subcons: SubconRow[]
  transactions: TransactionRow[]
  badgeById: Map<number, Badge>
  transactionTypes: Badge[]
  transitions: TransitionRow[]
  reqBadgeId: number | undefined
  cancelBadgeId: number | undefined
  canRequestWrite: boolean
  canTransactionWrite: boolean
  canSiteWrite: boolean
  onReload: () => Promise<void>
}) {
  const assigneeLabel = jobBuckets.length ? "FE" : "Subcon"
  const showBucketLabel = jobBuckets.length > 1
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", subcon_id: "" })
  const [assignModal, setAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignErr, setAssignErr] = useState("")
  const [removeModal, setRemoveModal] = useState<RemoveModal>({ open: false, assignment_id: 0, subcon_label: "", final_cost: "", err: "" })
  const [removing, setRemoving] = useState(false)
  const [txModal, setTxModal] = useState<TxModal>({ open: false, subconId: 0, bucketKey: "", subconLabel: "", type_id: "", amount: "", err: "" })
  const [txSubmitting, setTxSubmitting] = useState(false)

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)
  const selectedBucket = jobBuckets.length === 1
    ? jobBuckets[0]
    : (jobBuckets.find((bucket) => String(bucket.id) === assignmentForm.bucket_id) ?? null)
  const alreadyAssigned = !!selectedBucket && currentSite.subcon_rows.some((row) => row.active && row.bucket_key === selectedBucket.key)
  const hasActiveAssignment = currentSite.subcon_rows.some((row) => row.active)
  const allAssignableSlotsFilled = jobBuckets.length
    ? jobBuckets.every((bucket) => currentSite.subcon_rows.some((row) => row.active && row.bucket_key === bucket.key))
    : hasActiveAssignment

  async function assignSubcon() {
    if (jobBuckets.length > 1 && !assignmentForm.bucket_id) {
      setAssignErr("Job is required.")
      return
    }
    if (!assignmentForm.subcon_id) {
      setAssignErr(`${assigneeLabel} is required.`)
      return
    }
    const bucketId = assignmentForm.bucket_id ? Number(assignmentForm.bucket_id) : (jobBuckets.length === 1 ? jobBuckets[0].id : null)
    if (!bucketId && jobBuckets.length > 1) {
      setAssignErr("Job is required.")
      return
    }
    const payload = { bucket_id: bucketId, subcon_id: Number(assignmentForm.subcon_id) }
    const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments`
    setAssigning(true)
    setAssignErr("")
    try {
      await api.post(endpoint, payload)
      setAssignmentForm({ bucket_id: "", subcon_id: "" })
      setAssignModal(false)
      await onReload()
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
      setAssignErr(response?.data?.detail ?? `Failed to assign ${assigneeLabel}.`)
    } finally {
      setAssigning(false)
    }
  }

  async function removeSubcon() {
    if (!removeModal.assignment_id) return
    if (!removeModal.final_cost.trim()) {
      setRemoveModal((current) => ({ ...current, err: "Final cost is required." }))
      return
    }
    const payload = { final_cost: Number(removeModal.final_cost) }
    const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments/${removeModal.assignment_id}`
    setRemoving(true)
    setRemoveModal((current) => ({ ...current, err: "" }))
    try {
      await api.delete(endpoint, { data: payload })
      setRemoveModal({ open: false, assignment_id: 0, subcon_label: "", final_cost: "", err: "" })
      await onReload()
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
      setRemoveModal((current) => ({ ...current, err: response?.data?.detail ?? "Failed to remove subcon." }))
    } finally {
      setRemoving(false)
    }
  }

  async function submitTxModal() {
    if (!project?.id || !txModal.type_id || !txModal.amount) return
    setTxSubmitting(true)
    setTxModal((current) => ({ ...current, err: "" }))
    try {
      await api.post("/transactions", {
        project_id: project.id,
        site_id: currentSite.id,
        recipient_type_id: 2,
        recipient_id: txModal.subconId,
        bucket_key: txModal.bucketKey,
        type_id: Number(txModal.type_id),
        amount: txModal.amount,
      })
      setTxModal({ open: false, subconId: 0, bucketKey: "", subconLabel: "", type_id: "", amount: "", err: "" })
      await onReload()
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTxModal((current) => ({ ...current, err: detail ?? "Failed to submit request." }))
    } finally {
      setTxSubmitting(false)
    }
  }

  if (!canSiteWrite) return null

  return (
    <ActionPanel
      title={`${assigneeLabel} Assignment`}
      action={
        <Button
          type="button"
          disabled={allAssignableSlotsFilled}
          onClick={() => {
            if (allAssignableSlotsFilled) return
            setAssignmentForm({ bucket_id: jobBuckets.length === 1 ? String(jobBuckets[0].id) : "", subcon_id: "" })
            setAssignErr("")
            setAssignModal(true)
          }}
        >
          {`Assign ${assigneeLabel}`}
        </Button>
      }
    >
      <Modal
        isOpen={removeModal.open}
        title={`Remove ${assigneeLabel}`}
        onClose={() => setRemoveModal((current) => ({ ...current, open: false, err: "" }))}
        submitLabel={`Remove ${assigneeLabel}`}
        submitVariant="danger"
        onSubmit={() => void removeSubcon()}
        isSubmitting={removing}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Final Cost (₹)</span>
            <input
              type="number"
              value={removeModal.final_cost}
              onChange={(event) => setRemoveModal((current) => ({ ...current, final_cost: event.target.value }))}
              placeholder="Enter final cost"
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {removeModal.err ? <p className="text-sm text-red-600">{removeModal.err}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={assignModal}
        title={`Assign ${assigneeLabel}`}
        onClose={() => setAssignModal(false)}
        size="sm"
        submitLabel="Assign"
        onSubmit={() => void assignSubcon()}
        isSubmitting={assigning}
      >
        <div className="space-y-4">
          {jobBuckets.length > 1 && (
            <SelectField
              label="Job"
              value={assignmentForm.bucket_id}
              onChange={(value) => setAssignmentForm((current) => ({ ...current, bucket_id: value }))}
              placeholder="Select Job"
            >
                {jobBuckets.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>{bucket.label}</option>
                ))}
            </SelectField>
          )}
          <SelectField
            label={assigneeLabel}
            value={assignmentForm.subcon_id}
            onChange={(value) => setAssignmentForm((current) => ({ ...current, subcon_id: value }))}
            placeholder={`Select ${assigneeLabel}`}
          >
              {subcons.map((subcon) => (
                <option key={subcon.id} value={subcon.id}>{subcon.label}</option>
              ))}
          </SelectField>
          {alreadyAssigned ? <p className="text-sm text-red-600">{`An active ${assigneeLabel} already exists for this bucket.`}</p> : null}
          {assignErr ? <p className="text-sm text-red-600">{assignErr}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={txModal.open}
        title="Request"
        onClose={() => setTxModal((current) => ({ ...current, open: false }))}
        size="md"
        submitLabel="Submit Request"
        onSubmit={() => void submitTxModal()}
        isSubmitting={txSubmitting}
      >
        <div className="space-y-4">
          <p className="text-sm text-jscolors-text/60">{txModal.subconLabel}</p>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Type</span>
              <div className="relative">
                <select
                  value={txModal.type_id}
                  onChange={(event) => setTxModal((current) => ({ ...current, type_id: event.target.value }))}
                  className={selectCls}
                >
                  <option value="">Select Type</option>
                  {transactionTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-jscolors-text/45">
                  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M4.2 6.1a.75.75 0 0 1 1.06.04L8 9.08l2.74-2.94a.75.75 0 1 1 1.1 1.02l-3.3 3.54a.75.75 0 0 1-1.08 0L4.16 7.16a.75.75 0 0 1 .04-1.06Z" />
                  </svg>
                </span>
              </div>
            </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Amount</span>
            <input
              type="number"
              value={txModal.amount}
              onChange={(event) => setTxModal((current) => ({ ...current, amount: event.target.value }))}
              placeholder="Amount"
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {txModal.err ? <p className="text-sm text-red-600">{txModal.err}</p> : null}
        </div>
      </Modal>

      <div className="space-y-3">
        {currentSite.subcon_rows.length ? currentSite.subcon_rows.map((row) => {
          const rowTransactions = transactions.filter((transaction) => transaction.recipient_id === row.subcon_id)
          const displayLabel = showBucketLabel ? `${row.subcon_label} · ${bucketLabel(jobBuckets, row.bucket_key)}` : row.subcon_label
          return (
            <div key={`${row.assignment_id}-${row.bucket_key}`} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{displayLabel}</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-jscolors-text/60">
                    <span className="tabular-nums">Cost <span className="font-semibold text-jscolors-text">{formatCurrency(row.cost)}</span></span>
                    <span className="tabular-nums">Paid <span className="font-semibold text-jscolors-text">{formatCurrency(row.paid)}</span></span>
                    <span className="tabular-nums">Balance <span className="font-semibold text-jscolors-text">{formatCurrency(row.balance)}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canRequestWrite && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTxModal({ open: true, subconId: row.subcon_id, bucketKey: row.bucket_key, subconLabel: displayLabel, type_id: "", amount: "", err: "" })}
                    >
                      Request
                    </Button>
                  )}
                  {row.active && canSiteWrite && row.assignment_id ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="rounded-2xl py-1.5 font-medium text-red-700"
                      onClick={() => setRemoveModal({ open: true, assignment_id: row.assignment_id, subcon_label: row.subcon_label, final_cost: "", err: "" })}
                    >
                      {`Remove ${assigneeLabel}`}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {rowTransactions.length ? rowTransactions.map((transaction) => (
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
                )) : <EmptyState text="No transactions for this subcon yet" />}
              </div>
            </div>
          )
        }) : <EmptyState text={subcons.length ? `No ${assigneeLabel} assignments yet` : `No ${assigneeLabel}s available for this project`} />}
      </div>
      {transactions.some((transaction) => !transaction.recipient_id) ? (
        <div className="mt-4 space-y-3">
          {transactions.filter((transaction) => !transaction.recipient_id).map((transaction) => (
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
          ))}
        </div>
      ) : null}
    </ActionPanel>
  )
}
