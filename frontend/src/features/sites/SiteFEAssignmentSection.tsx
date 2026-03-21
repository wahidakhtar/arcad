import { useState, type ReactNode } from "react"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { Badge, JobBucket, ProjectRow, ProviderRow, SiteDetail, TransactionRow, TransitionRow, UserRow } from "./siteDetailTypes"
import { bucketLabel, transactionDraftKey, transitionOptions } from "./siteDetailHelpers"
import SiteTransactionCard from "./SiteTransactionCard"

type TransactionDraft = { open: boolean; type_id: string; amount: string; remarks: string }

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
}

function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function SiteFEAssignmentSection({
  currentSite,
  projectKey,
  project,
  jobBuckets,
  foUsers,
  transactions,
  badgeById,
  transactionTypes,
  transitions,
  reqBadgeId,
  cancelBadgeId,
  canRequestWrite,
  canTransactionWrite,
  providers,
  isOpsL1Only,
  onReload,
}: {
  currentSite: SiteDetail
  projectKey: string
  project: ProjectRow | null
  jobBuckets: JobBucket[]
  foUsers: UserRow[]
  transactions: TransactionRow[]
  badgeById: Map<number, Badge>
  transactionTypes: Badge[]
  transitions: TransitionRow[]
  reqBadgeId: number | undefined
  cancelBadgeId: number | undefined
  canRequestWrite: boolean
  canTransactionWrite: boolean
  providers: ProviderRow[]
  isOpsL1Only: boolean
  onReload: () => Promise<void>
}) {
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", fe_id: "" })
  const [removeModal, setRemoveModal] = useState<{ open: boolean; fe_id: number; bucket_id: number; fe_label: string; final_cost: string }>({ open: false, fe_id: 0, bucket_id: 0, fe_label: "", final_cost: "" })
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, TransactionDraft>>({})
  const [providerAssignId, setProviderAssignId] = useState("")
  const [savingProviderAssign, setSavingProviderAssign] = useState(false)

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)

  async function assignProvider() {
    if (!providerAssignId) return
    setSavingProviderAssign(true)
    try {
      await api.post(`/sites/${projectKey}/${currentSite.id}/assignments`, { provider_id: Number(providerAssignId) })
      setProviderAssignId("")
      await onReload()
    } finally {
      setSavingProviderAssign(false)
    }
  }

  async function submitFeTransaction(feId: number, bucketKey: string) {
    const draftKey = transactionDraftKey(feId, bucketKey)
    const draft = transactionDrafts[draftKey]
    if (!draft || !project?.id || !draft.type_id || !draft.amount) return
    await api.post("/transactions", {
      project_id: project.id,
      site_id: currentSite.id,
      recipient_id: feId,
      bucket_key: bucketKey,
      type_id: Number(draft.type_id),
      amount: draft.amount,
      remarks: draft.remarks || null,
    })
    setTransactionDrafts((c) => ({ ...c, [draftKey]: { open: false, type_id: "", amount: "", remarks: "" } }))
    await onReload()
  }

  if (projectKey === "bb") {
    return (
      <ActionPanel title="Provider Assignment">
        <div className="grid gap-3">
          <select
            value={providerAssignId}
            onChange={(e) => setProviderAssignId(e.target.value)}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          >
            <option value="">Select Provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button type="button" className="premium-button" disabled={savingProviderAssign || !providerAssignId} onClick={() => void assignProvider()}>
            {savingProviderAssign ? "Assigning..." : "Assign Provider"}
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {currentSite.provider_rows.length ? currentSite.provider_rows.map((row) => (
            <div key={row.assignment_id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.provider_label}</div>
                  {row.created_at && <div className="mt-1 text-xs text-jscolors-text/60">{row.created_at.slice(0, 10)}</div>}
                </div>
                {row.active && (
                  <button
                    type="button"
                    className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                    onClick={() => void api.delete(`/sites/${projectKey}/${currentSite.id}/assignments/${row.assignment_id}`).then(() => onReload())}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )) : <EmptyState text="No provider assignments yet" />}
        </div>
      </ActionPanel>
    )
  }

  if (isOpsL1Only) return null

  return (
    <ActionPanel title="FE Assignment">
      <Modal
        open={removeModal.open}
        title={`Remove ${removeModal.fe_label}`}
        onClose={() => setRemoveModal((m) => ({ ...m, open: false }))}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Final Cost (₹) — optional</span>
            <input
              type="number"
              value={removeModal.final_cost}
              onChange={(e) => setRemoveModal((m) => ({ ...m, final_cost: e.target.value }))}
              placeholder="Leave blank if unknown"
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            className="premium-button w-full"
            onClick={() => {
              const { fe_id, bucket_id, final_cost } = removeModal
              setRemoveModal((m) => ({ ...m, open: false }))
              void api
                .patch(`/sites/${projectKey}/${currentSite.id}/assignments/${fe_id}/${bucket_id}/remove`, {
                  final_cost: final_cost ? Number(final_cost) : null,
                })
                .then(() => onReload())
            }}
          >
            Confirm Remove
          </button>
        </div>
      </Modal>

      <div className="grid gap-3 md:grid-cols-2">
        {jobBuckets.length > 1 && (
          <select
            value={assignmentForm.bucket_id}
            onChange={(e) => setAssignmentForm((c) => ({ ...c, bucket_id: e.target.value }))}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          >
            <option value="">Select Bucket</option>
            {jobBuckets.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        )}
        <select
          value={assignmentForm.fe_id}
          onChange={(e) => setAssignmentForm((c) => ({ ...c, fe_id: e.target.value }))}
          className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
        >
          <option value="">Select FE</option>
          {foUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
      </div>
      {(() => {
        const alreadyAssigned =
          !!assignmentForm.bucket_id &&
          currentSite.fe_rows.some(
            (r) => r.active && r.bucket_key === jobBuckets.find((b) => String(b.id) === assignmentForm.bucket_id)?.key,
          )
        return (
          <button
            type="button"
            className={`premium-button mt-3${alreadyAssigned ? " cursor-not-allowed opacity-50" : ""}`}
            disabled={alreadyAssigned}
            onClick={() => {
              if (!assignmentForm.bucket_id || !assignmentForm.fe_id) return
              void api
                .post(`/sites/${projectKey}/${currentSite.id}/assignments`, { bucket_id: Number(assignmentForm.bucket_id), fe_id: Number(assignmentForm.fe_id) })
                .then(() => {
                  setAssignmentForm({ bucket_id: "", fe_id: "" })
                  return onReload()
                })
            }}
          >
            Assign FE
          </button>
        )
      })()}

      <div className="mt-4 space-y-3">
        {currentSite.fe_rows.length ? currentSite.fe_rows.map((row) => {
          const draftKey = transactionDraftKey(row.fe_id, row.bucket_key)
          const draft = transactionDrafts[draftKey] ?? { open: false, type_id: "", amount: "", remarks: "" }
          const rowTransactions = transactions.filter((t) => t.recipient_id === row.fe_id && t.bucket_key === row.bucket_key)
          return (
            <div key={`${row.fe_id}-${row.bucket_key}`} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.fe_label} · {bucketLabel(jobBuckets, row.bucket_key)}</div>
                  <div className="mt-1 text-sm text-jscolors-text/60">Cost {row.cost} • Paid {row.paid} • Balance {row.balance}</div>
                </div>
                <div className="flex gap-2">
                  {canRequestWrite && (
                    <button
                      type="button"
                      className="premium-button-secondary"
                      onClick={() => setTransactionDrafts((c) => ({ ...c, [draftKey]: { ...draft, open: !draft.open } }))}
                    >
                      Request Transaction
                    </button>
                  )}
                  {row.active && (
                    <button
                      type="button"
                      className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                      onClick={() => {
                        const bucket = jobBuckets.find((b) => b.key === row.bucket_key)
                        setRemoveModal({ open: true, fe_id: row.fe_id, bucket_id: bucket?.id ?? 0, fe_label: row.fe_label, final_cost: "" })
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {draft.open ? (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={draft.type_id}
                      onChange={(e) => setTransactionDrafts((c) => ({ ...c, [draftKey]: { ...draft, type_id: e.target.value } }))}
                      className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                    >
                      <option value="">Select Type</option>
                      {transactionTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={draft.amount}
                      onChange={(e) => setTransactionDrafts((c) => ({ ...c, [draftKey]: { ...draft, amount: e.target.value } }))}
                      placeholder="Amount"
                      className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                    />
                  </div>
                  <textarea
                    value={draft.remarks}
                    onChange={(e) => setTransactionDrafts((c) => ({ ...c, [draftKey]: { ...draft, remarks: e.target.value } }))}
                    placeholder="Remarks"
                    rows={3}
                    className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                  />
                  <button type="button" className="premium-button" onClick={() => void submitFeTransaction(row.fe_id, row.bucket_key)}>
                    Submit Request
                  </button>
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                {rowTransactions.length ? rowTransactions.map((tx) => (
                  <SiteTransactionCard
                    key={tx.id}
                    row={tx}
                    badges={badgeById}
                    reqTransitions={reqTransitions}
                    canRequestWrite={canRequestWrite}
                    canTransactionWrite={canTransactionWrite}
                    cancelBadgeId={cancelBadgeId}
                    onUpdate={onReload}
                  />
                )) : <EmptyState text="No transactions for this FE yet" />}
              </div>
            </div>
          )
        }) : <EmptyState text={foUsers.length ? "No FE assignments yet" : "No FO users available for this project"} />}
      </div>
      {transactions.some((t) => !t.recipient_id || !t.bucket_key) ? (
        <div className="mt-4 space-y-3">
          {transactions.filter((t) => !t.recipient_id || !t.bucket_key).map((tx) => (
            <SiteTransactionCard
              key={tx.id}
              row={tx}
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
