import { useState, type ReactNode } from "react"

import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import Modal from "../../components/ui/Modal"
import SelectInput from "../../components/ui/SelectInput"
import { api } from "../../lib/api"
import { formatCurrency } from "../../utils/format"
import type { Badge, JobBucket, ProjectRow, SiteDetail, SubconRow, TransactionRow, TransitionRow } from "./siteDetailTypes"
import { bucketLabel, transitionOptions } from "./siteDetailHelpers"
import SiteTransactionCard from "./SiteTransactionCard"

type TxModal = { open: boolean; subconId: number; bucketKey: string; subconLabel: string; type_id: string; amount: string; err: string }
type RemoveModal = { open: boolean; assignment_id: number; subcon_label: string; final_cost: string; err: string }
type RechargeModal = { open: boolean; subconId: number; subconLabel: string; amount: string; validity: string; uom: string; err: string }

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
        <SelectInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {children}
        </SelectInput>
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
  statusKey,
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
  statusKey: string
  onReload: () => Promise<void>
}) {
  const assigneeLabel = projectKey === "bb" ? "Provider" : jobBuckets.length ? "FE" : "Subcon"
  const isBB = projectKey === "bb"
  const siteOutcome = String(currentSite.fields.outcome_label ?? "").trim().toLowerCase()
  const hasMultipleBuckets = jobBuckets.length > 1
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", subcon_id: "" })
  const [assignModal, setAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignErr, setAssignErr] = useState("")
  const [removeModal, setRemoveModal] = useState<RemoveModal>({ open: false, assignment_id: 0, subcon_label: "", final_cost: "", err: "" })
  const [removing, setRemoving] = useState(false)
  const [txModal, setTxModal] = useState<TxModal>({ open: false, subconId: 0, bucketKey: "", subconLabel: "", type_id: "", amount: "", err: "" })
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [rechargeModal, setRechargeModal] = useState<RechargeModal>({ open: false, subconId: 0, subconLabel: "", amount: "", validity: "", uom: "days", err: "" })
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false)

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)
  const hasActiveAssignment = currentSite.subcon_rows.some((row) => row.active)
  const fePayTypeId = transactionTypes.find((type) => type.key === "fe_pay")?.id
  const selectedBucket = jobBuckets.length === 1
    ? jobBuckets[0]
    : (jobBuckets.find((bucket) => String(bucket.id) === assignmentForm.bucket_id) ?? null)

  function isBucketDisabled(bucket: JobBucket) {
    return projectKey === "md" && bucket.key === "bmd" && siteOutcome !== "dismantle"
  }

  function firstAvailableBucket() {
    return jobBuckets.find((bucket) => !isBucketDisabled(bucket)) ?? jobBuckets[0] ?? null
  }

  async function assignSubcon() {
    if (jobBuckets.length > 1 && !assignmentForm.bucket_id) {
      setAssignErr("Job is required.")
      return
    }
    if (!assignmentForm.subcon_id) {
      setAssignErr(`${assigneeLabel} is required.`)
      return
    }
    if (selectedBucket && isBucketDisabled(selectedBucket)) {
      setAssignErr("Dismantle assignment is only available when outcome is Dismantle.")
      return
    }
    const bucketId = assignmentForm.bucket_id ? Number(assignmentForm.bucket_id) : (jobBuckets.length === 1 ? jobBuckets[0].id : null)
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

  async function submitRechargeRequest() {
    if (!project?.id || !fePayTypeId || !rechargeModal.subconId || !rechargeModal.amount || !rechargeModal.validity) return
    setRechargeSubmitting(true)
    setRechargeModal((current) => ({ ...current, err: "" }))
    try {
      await api.post("/transactions", {
        project_id: project.id,
        site_id: currentSite.id,
        recipient_id: rechargeModal.subconId,
        type_id: fePayTypeId,
        amount: rechargeModal.amount,
        remarks: `${Number(rechargeModal.validity)} ${rechargeModal.uom}`,
        recharge_validity: Number(rechargeModal.validity),
        recharge_uom: rechargeModal.uom,
      })
      setRechargeModal({ open: false, subconId: 0, subconLabel: "", amount: "", validity: "", uom: "days", err: "" })
      await onReload()
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setRechargeModal((current) => ({ ...current, err: detail ?? "Failed to submit request." }))
    } finally {
      setRechargeSubmitting(false)
    }
  }

  if (!canSiteWrite && !canTransactionWrite && !canRequestWrite) return null

  return (
    <ActionPanel
      title={isBB ? "Providers" : `${assigneeLabel} Assignment`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={hasActiveAssignment}
            onClick={() => {
              if (hasActiveAssignment) return
              const initialBucket = firstAvailableBucket()
              setAssignmentForm({
                bucket_id: initialBucket ? String(initialBucket.id) : "",
                subcon_id: "",
              })
              setAssignErr("")
              setAssignModal(true)
            }}
          >
            {`Assign ${assigneeLabel}`}
          </Button>
        </div>
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
          {hasMultipleBuckets && (
            <div className="flex gap-2">
              {jobBuckets.map((bucket) => {
                const disabled = isBucketDisabled(bucket)
                return (
                  <Button
                    key={bucket.id}
                    type="button"
                    variant={assignmentForm.bucket_id === String(bucket.id) ? "primary" : "secondary"}
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return
                      setAssignmentForm((current) => ({ ...current, bucket_id: String(bucket.id) }))
                      setAssignErr("")
                    }}
                  >
                    {bucket.label}
                  </Button>
                )
              })}
            </div>
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
          {hasMultipleBuckets && selectedBucket && isBucketDisabled(selectedBucket) ? (
            <p className="text-sm text-jscolors-text/60">Dismantle FE assignment is available only after the site outcome is set to Dismantle.</p>
          ) : null}
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
              <SelectInput
                value={txModal.type_id}
                onChange={(event) => setTxModal((current) => ({ ...current, type_id: event.target.value }))}
              >
                <option value="">Select Type</option>
                {transactionTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </SelectInput>
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

      <Modal
        isOpen={rechargeModal.open}
        title="Request Recharge"
        onClose={() => setRechargeModal((current) => ({ ...current, open: false, err: "" }))}
        size="sm"
        submitLabel="Submit Request"
        onSubmit={() => void submitRechargeRequest()}
        isSubmitting={rechargeSubmitting}
      >
        <div className="space-y-4">
          <p className="text-sm text-jscolors-text/60">{rechargeModal.subconLabel}</p>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Amount *</span>
            <input
              type="number"
              value={rechargeModal.amount}
              onChange={(event) => setRechargeModal((current) => ({ ...current, amount: event.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Validity *</span>
            <input
              type="number"
              value={rechargeModal.validity}
              onChange={(event) => setRechargeModal((current) => ({ ...current, validity: event.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Unit *</span>
            <SelectInput value={rechargeModal.uom} onChange={(event) => setRechargeModal((current) => ({ ...current, uom: event.target.value }))}>
              <option value="days">Days</option>
              <option value="months">Months</option>
            </SelectInput>
          </label>
          {rechargeModal.err ? <p className="text-sm text-red-600">{rechargeModal.err}</p> : null}
        </div>
      </Modal>

      <div className="space-y-3">
        {currentSite.subcon_rows.length ? currentSite.subcon_rows.map((row) => {
          const rowTransactions = transactions.filter((transaction) => transaction.recipient_id === row.subcon_id)
          const displayLabel = hasMultipleBuckets ? `${row.subcon_label} · ${bucketLabel(jobBuckets, row.bucket_key)}` : row.subcon_label
          return (
            <div key={`${row.assignment_id}-${row.bucket_key}`} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{displayLabel}</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-jscolors-text/60">
                    {isBB ? (
                      <span className="tabular-nums">Paid <span className="font-semibold text-jscolors-text">{formatCurrency(row.paid)}</span></span>
                    ) : (
                      <>
                        <span className="tabular-nums">Cost <span className="font-semibold text-jscolors-text">{formatCurrency(row.cost)}</span></span>
                        <span className="tabular-nums">Paid <span className="font-semibold text-jscolors-text">{formatCurrency(row.paid)}</span></span>
                        <span className="tabular-nums">Balance <span className="font-semibold text-jscolors-text">{formatCurrency(row.balance)}</span></span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {canRequestWrite && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isBB && statusKey === "term"}
                      onClick={() => {
                        if (isBB) {
                          setRechargeModal({ open: true, subconId: row.subcon_id, subconLabel: displayLabel, amount: "", validity: "", uom: "days", err: "" })
                          return
                        }
                        setTxModal({ open: true, subconId: row.subcon_id, bucketKey: row.bucket_key, subconLabel: displayLabel, type_id: "", amount: "", err: "" })
                      }}
                    >
                      {isBB ? "Request Recharge" : "Request"}
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
                    projectKey={projectKey}
                  />
                )) : <EmptyState text="No transactions for this subcon yet" />}
              </div>
            </div>
          )
        }) : <EmptyState text={subcons.length ? `No ${assigneeLabel} assignments yet` : `No ${assigneeLabel}s available for this project`} />}
      </div>
      {transactions.some((transaction) => !transaction.recipient_id && badgeById.get(transaction.type_id)?.key !== "rec") ? (
        <div className="mt-4 space-y-3">
          {transactions.filter((transaction) => !transaction.recipient_id && badgeById.get(transaction.type_id)?.key !== "rec").map((transaction) => (
            <SiteTransactionCard
              key={transaction.id}
              row={transaction}
              badges={badgeById}
              reqTransitions={reqTransitions}
              canRequestWrite={canRequestWrite}
              canTransactionWrite={canTransactionWrite}
              cancelBadgeId={cancelBadgeId}
              onUpdate={onReload}
              projectKey={projectKey}
            />
          ))}
        </div>
      ) : null}
    </ActionPanel>
  )
}
