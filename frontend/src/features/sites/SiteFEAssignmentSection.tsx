import { useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { Badge, JobBucket, ProjectRow, SiteDetail, SubconRow, TransactionRow, TransitionRow } from "./siteDetailTypes"
import { bucketLabel, transitionOptions } from "./siteDetailHelpers"
import SiteTransactionCard from "./SiteTransactionCard"

type TxModal = { open: boolean; subconId: number; bucketKey: string; subconLabel: string; type_id: string; amount: string; err: string }
type RemoveModal = { open: boolean; assignment_id: number; subcon_label: string; final_cost: string; err: string }

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
}

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
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", subcon_id: "" })
  const [assignModal, setAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignErr, setAssignErr] = useState("")
  const [removeModal, setRemoveModal] = useState<RemoveModal>({ open: false, assignment_id: 0, subcon_label: "", final_cost: "", err: "" })
  const [removing, setRemoving] = useState(false)
  const [txModal, setTxModal] = useState<TxModal>({ open: false, subconId: 0, bucketKey: "", subconLabel: "", type_id: "", amount: "", err: "" })
  const [txSubmitting, setTxSubmitting] = useState(false)

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)
  const selectedBucket = jobBuckets.find((bucket) => String(bucket.id) === assignmentForm.bucket_id) ?? null
  const alreadyAssigned = !!selectedBucket && currentSite.subcon_rows.some((row) => row.active && row.bucket_key === selectedBucket.key)

  async function assignSubcon() {
    if (!assignmentForm.bucket_id || !assignmentForm.subcon_id) return
    const payload = { bucket_id: Number(assignmentForm.bucket_id), subcon_id: Number(assignmentForm.subcon_id) }
    const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments`
    console.log("[SiteFEAssignmentSection] assignSubcon:start", {
      projectKey,
      siteId: currentSite.id,
      bucketId: assignmentForm.bucket_id,
      subconId: assignmentForm.subcon_id,
      endpoint,
      payload,
    })
    setAssigning(true)
    setAssignErr("")
    try {
      const response = await api.post(endpoint, payload)
      console.log("[SiteFEAssignmentSection] assignSubcon:success", {
        status: response.status,
        data: response.data,
      })
      setAssignmentForm({ bucket_id: "", subcon_id: "" })
      setAssignModal(false)
      await onReload()
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
      console.error("[SiteFEAssignmentSection] assignSubcon:error", {
        projectKey,
        siteId: currentSite.id,
        bucketId: assignmentForm.bucket_id,
        subconId: assignmentForm.subcon_id,
        endpoint,
        payload,
        status: response?.status,
        data: response?.data,
        error,
      })
      setAssignErr(response?.data?.detail ?? "Failed to assign subcon.")
    } finally {
      setAssigning(false)
    }
  }

  async function removeSubcon() {
    if (!removeModal.assignment_id) return
    const payload = { final_cost: removeModal.final_cost ? Number(removeModal.final_cost) : null }
    const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments/${removeModal.assignment_id}`
    console.log("[SiteFEAssignmentSection] removeSubcon:start", {
      projectKey,
      siteId: currentSite.id,
      assignmentId: removeModal.assignment_id,
      endpoint,
      payload,
    })
    setRemoving(true)
    setRemoveModal((current) => ({ ...current, err: "" }))
    try {
      const response = await api.delete(endpoint, { data: payload })
      console.log("[SiteFEAssignmentSection] removeSubcon:success", {
        status: response.status,
        data: response.data,
      })
      setRemoveModal({ open: false, assignment_id: 0, subcon_label: "", final_cost: "", err: "" })
      await onReload()
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
      console.error("[SiteFEAssignmentSection] removeSubcon:error", {
        projectKey,
        siteId: currentSite.id,
        assignmentId: removeModal.assignment_id,
        endpoint,
        payload,
        status: response?.status,
        data: response?.data,
        error,
      })
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
      title="Subcon Assignment"
      action={
        <button
          type="button"
          className="premium-button"
          onClick={() => {
            setAssignmentForm({ bucket_id: "", subcon_id: "" })
            setAssignErr("")
            setAssignModal(true)
          }}
        >
          Assign Subcon
        </button>
      }
    >
      <Modal
        open={removeModal.open}
        title={`Remove ${removeModal.subcon_label}`}
        onClose={() => setRemoveModal((current) => ({ ...current, open: false, err: "" }))}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Final Cost (₹) — optional</span>
            <input
              type="number"
              value={removeModal.final_cost}
              onChange={(event) => setRemoveModal((current) => ({ ...current, final_cost: event.target.value }))}
              placeholder="Leave blank if unknown"
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {removeModal.err ? <p className="text-sm text-red-600">{removeModal.err}</p> : null}
          <button
            type="button"
            className="premium-button w-full"
            disabled={removing}
            onClick={() => void removeSubcon()}
          >
            {removing ? "Removing..." : "Confirm Remove"}
          </button>
        </div>
      </Modal>

      {assignModal && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setAssignModal(false) }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-sm p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Assign Subcon</h2>
              <button type="button" onClick={() => setAssignModal(false)} className="premium-button-secondary">Close</button>
            </div>
            <div className="space-y-4">
              {jobBuckets.length > 1 && (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Bucket</span>
                  <select
                    value={assignmentForm.bucket_id}
                    onChange={(event) => setAssignmentForm((current) => ({ ...current, bucket_id: event.target.value }))}
                    className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                  >
                    <option value="">Select Bucket</option>
                    {jobBuckets.map((bucket) => (
                      <option key={bucket.id} value={bucket.id}>{bucket.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Subcon</span>
                <select
                  value={assignmentForm.subcon_id}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, subcon_id: event.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  <option value="">Select Subcon</option>
                  {subcons.map((subcon) => (
                    <option key={subcon.id} value={subcon.id}>{subcon.label}</option>
                  ))}
                </select>
              </label>
              {alreadyAssigned ? <p className="text-sm text-red-600">An active subcon already exists for this bucket.</p> : null}
              {assignErr ? <p className="text-sm text-red-600">{assignErr}</p> : null}
              <button
                type="button"
                className="premium-button w-full"
                disabled={assigning || alreadyAssigned || !assignmentForm.bucket_id || !assignmentForm.subcon_id}
                onClick={() => void assignSubcon()}
              >
                {assigning ? "Assigning..." : "Assign Subcon"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {txModal.open && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setTxModal((current) => ({ ...current, open: false })) }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-md p-6"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Request Transaction</h2>
              <button type="button" onClick={() => setTxModal((current) => ({ ...current, open: false }))} className="premium-button-secondary">Close</button>
            </div>
            <p className="mb-4 text-sm text-jscolors-text/60">{txModal.subconLabel}</p>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Type</span>
                <select
                  value={txModal.type_id}
                  onChange={(event) => setTxModal((current) => ({ ...current, type_id: event.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="">Select Type</option>
                  {transactionTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
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
              <button
                type="button"
                className="premium-button w-full"
                disabled={txSubmitting || !txModal.type_id || !txModal.amount}
                onClick={() => void submitTxModal()}
              >
                {txSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <div className="space-y-3">
        {currentSite.subcon_rows.length ? currentSite.subcon_rows.map((row) => {
          const rowTransactions = transactions.filter((transaction) => transaction.recipient_id === row.subcon_id && transaction.bucket_key === row.bucket_key)
          return (
            <div key={`${row.assignment_id}-${row.bucket_key}`} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.subcon_label} · {bucketLabel(jobBuckets, row.bucket_key)}</div>
                  <div className="mt-1 text-sm text-jscolors-text/60">Cost {row.cost} • Paid {row.paid} • Balance {row.balance}</div>
                </div>
                <div className="flex gap-2">
                  {canRequestWrite && (
                    <button
                      type="button"
                      className="premium-button-secondary"
                      onClick={() => setTxModal({ open: true, subconId: row.subcon_id, bucketKey: row.bucket_key, subconLabel: `${row.subcon_label} · ${bucketLabel(jobBuckets, row.bucket_key)}`, type_id: "", amount: "", err: "" })}
                    >
                      Request Transaction
                    </button>
                  )}
                  {row.active && canSiteWrite && row.assignment_id ? (
                    <button
                      type="button"
                      className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      onClick={() => setRemoveModal({ open: true, assignment_id: row.assignment_id, subcon_label: row.subcon_label, final_cost: "", err: "" })}
                    >
                      Remove
                    </button>
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
        }) : <EmptyState text={subcons.length ? "No subcon assignments yet" : "No subcons available for this project"} />}
      </div>
      {transactions.some((transaction) => !transaction.recipient_id || !transaction.bucket_key) ? (
        <div className="mt-4 space-y-3">
          {transactions.filter((transaction) => !transaction.recipient_id || !transaction.bucket_key).map((transaction) => (
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
