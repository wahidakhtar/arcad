import { useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"
import type { Badge, JobBucket, ProjectRow, ProviderRow, SiteDetail, TransactionRow, TransitionRow, UserRow } from "./siteDetailTypes"
import { bucketLabel, transitionOptions } from "./siteDetailHelpers"
import SiteTransactionCard from "./SiteTransactionCard"

type TxModal = { open: boolean; feId: number; bucketKey: string; feLabel: string; type_id: string; amount: string; err: string }

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
  canSiteWrite,
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
  canSiteWrite: boolean
  providers: ProviderRow[]
  onReload: () => Promise<void>
}) {
  const isBB = projectKey === "bb"
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", fe_id: "" })
  const [assignModal, setAssignModal] = useState(false)
  const [removeModal, setRemoveModal] = useState<{ open: boolean; fe_id: number; bucket_id: number; fe_label: string; final_cost: string }>({ open: false, fe_id: 0, bucket_id: 0, fe_label: "", final_cost: "" })
  const [txModal, setTxModal] = useState<TxModal>({ open: false, feId: 0, bucketKey: "", feLabel: "", type_id: "", amount: "", err: "" })
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [providerAssignId, setProviderAssignId] = useState("")
  const [providerModal, setProviderModal] = useState(false)
  const [savingProviderAssign, setSavingProviderAssign] = useState(false)

  const reqTransitions = transitionOptions(transitions, "transaction_status", reqBadgeId ?? 0)

  async function assignProvider() {
    if (!providerAssignId) return
    const payload = { provider_id: Number(providerAssignId) }
    const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments`
    console.log("[SiteFEAssignmentSection] assignProvider:start", {
      projectKey,
      isBB,
      siteId: currentSite.id,
      providerAssignId,
      feAssignId: null,
      endpoint,
      payload,
    })
    setSavingProviderAssign(true)
    try {
      const response = await api.post(endpoint, payload)
      console.log("[SiteFEAssignmentSection] assignProvider:success", {
        status: response.status,
        data: response.data,
      })
      setProviderAssignId("")
      await onReload()
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: unknown } }).response
      console.error("[SiteFEAssignmentSection] assignProvider:error", {
        projectKey,
        isBB,
        siteId: currentSite.id,
        providerAssignId,
        endpoint,
        payload,
        status: response?.status,
        data: response?.data,
        error,
      })
      throw error
    } finally {
      setSavingProviderAssign(false)
    }
  }

  async function submitTxModal() {
    if (!project?.id || !txModal.type_id || !txModal.amount) return
    setTxSubmitting(true)
    setTxModal((m) => ({ ...m, err: "" }))
    try {
      await api.post("/transactions", {
        project_id: project.id,
        site_id: currentSite.id,
        recipient_id: txModal.feId,
        bucket_key: txModal.bucketKey,
        type_id: Number(txModal.type_id),
        amount: txModal.amount,
      })
      setTxModal({ open: false, feId: 0, bucketKey: "", feLabel: "", type_id: "", amount: "", err: "" })
      await onReload()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTxModal((m) => ({ ...m, err: detail ?? "Failed to submit request." }))
    } finally {
      setTxSubmitting(false)
    }
  }

  if (isBB) {
    return (
      <ActionPanel
        title="Provider Assignment"
        action={
          canSiteWrite ? (
            <button type="button" className="premium-button" onClick={() => { setProviderAssignId(""); setProviderModal(true) }}>
              Assign Provider
            </button>
          ) : undefined
        }
      >
        {providerModal && createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setProviderModal(false) }}
          >
            <div
              style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
              className="glass-panel w-full max-w-sm p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Assign Provider</h2>
                <button type="button" onClick={() => setProviderModal(false)} className="premium-button-secondary">Close</button>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Provider</span>
                  <select
                    value={providerAssignId}
                    onChange={(e) => setProviderAssignId(e.target.value)}
                    className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                  >
                    <option value="">Select Provider</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="premium-button w-full"
                  disabled={savingProviderAssign || !providerAssignId}
                  onClick={() => {
                    void assignProvider().then(() => setProviderModal(false))
                  }}
                >
                  {savingProviderAssign ? "Assigning..." : "Assign Provider"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
        <div className="space-y-3">
          {currentSite.provider_rows.length ? currentSite.provider_rows.map((row) => (
            <div key={row.assignment_id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-jscolors-text">{row.provider_label}</div>
                  {row.created_at && <div className="mt-1 text-xs text-jscolors-text/60">{row.created_at.slice(0, 10)}</div>}
                </div>
                {row.active && canSiteWrite && (
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

  if (!canSiteWrite) return null

  const alreadyAssigned =
    !!assignmentForm.bucket_id &&
    currentSite.fe_rows.some(
      (r) => r.active && r.bucket_key === jobBuckets.find((b) => String(b.id) === assignmentForm.bucket_id)?.key,
    )

  return (
    <ActionPanel
      title="FE Assignment"
      action={
        <button type="button" className="premium-button" onClick={() => { setAssignmentForm({ bucket_id: "", fe_id: "" }); setAssignModal(true) }}>
          Assign FE
        </button>
      }
    >
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

      {assignModal && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAssignModal(false) }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-sm p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Assign FE</h2>
              <button type="button" onClick={() => setAssignModal(false)} className="premium-button-secondary">Close</button>
            </div>
            <div className="space-y-4">
              {jobBuckets.length > 1 && (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Bucket</span>
                  <select
                    value={assignmentForm.bucket_id}
                    onChange={(e) => setAssignmentForm((c) => ({ ...c, bucket_id: e.target.value }))}
                    className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                  >
                    <option value="">Select Bucket</option>
                    {jobBuckets.map((b) => (
                      <option key={b.id} value={b.id}>{b.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Field Engineer</span>
                <select
                  value={assignmentForm.fe_id}
                  onChange={(e) => setAssignmentForm((c) => ({ ...c, fe_id: e.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  <option value="">Select FE</option>
                  {foUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </label>
              {alreadyAssigned && <p className="text-sm text-red-600">A FE is already active for this bucket.</p>}
              <button
                type="button"
                className="premium-button w-full"
                disabled={alreadyAssigned || !assignmentForm.bucket_id || !assignmentForm.fe_id}
                onClick={async () => {
                  if (!assignmentForm.bucket_id || !assignmentForm.fe_id) return
                  const payload = { bucket_id: Number(assignmentForm.bucket_id), fe_id: Number(assignmentForm.fe_id) }
                  const endpoint = `/sites/${projectKey}/${currentSite.id}/assignments`
                  console.log("[SiteFEAssignmentSection] assignFE:start", {
                    projectKey,
                    isBB,
                    siteId: currentSite.id,
                    providerAssignId,
                    feAssignId: assignmentForm.fe_id,
                    bucketId: assignmentForm.bucket_id,
                    endpoint,
                    payload,
                  })
                  try {
                    const response = await api.post(endpoint, payload)
                    console.log("[SiteFEAssignmentSection] assignFE:success", {
                      status: response.status,
                      data: response.data,
                    })
                    setAssignmentForm({ bucket_id: "", fe_id: "" })
                    setAssignModal(false)
                    await onReload()
                  } catch (error: unknown) {
                    const response = (error as { response?: { status?: number; data?: unknown } }).response
                    console.error("[SiteFEAssignmentSection] assignFE:error", {
                      projectKey,
                      isBB,
                      siteId: currentSite.id,
                      providerAssignId,
                      feAssignId: assignmentForm.fe_id,
                      bucketId: assignmentForm.bucket_id,
                      endpoint,
                      payload,
                      status: response?.status,
                      data: response?.data,
                      error,
                    })
                  }
                }}
              >
                Assign FE
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
          onMouseDown={(e) => { if (e.target === e.currentTarget) setTxModal((m) => ({ ...m, open: false })) }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-md p-6"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Request Transaction</h2>
              <button type="button" onClick={() => setTxModal((m) => ({ ...m, open: false }))} className="premium-button-secondary">Close</button>
            </div>
            <p className="mb-4 text-sm text-jscolors-text/60">{txModal.feLabel}</p>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Type</span>
                <select
                  value={txModal.type_id}
                  onChange={(e) => setTxModal((m) => ({ ...m, type_id: e.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="">Select Type</option>
                  {transactionTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Amount</span>
                <input
                  type="number"
                  value={txModal.amount}
                  onChange={(e) => setTxModal((m) => ({ ...m, amount: e.target.value }))}
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
        {currentSite.fe_rows.length ? currentSite.fe_rows.map((row) => {
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
                      onClick={() => setTxModal({ open: true, feId: row.fe_id, bucketKey: row.bucket_key, feLabel: `${row.fe_label} · ${bucketLabel(jobBuckets, row.bucket_key)}`, type_id: "", amount: "", err: "" })}
                    >
                      Request Transaction
                    </button>
                  )}
                  {row.active && canSiteWrite && (
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
