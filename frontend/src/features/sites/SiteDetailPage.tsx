import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "react-router-dom"

import FieldRenderer, { type FieldDefinition } from "../../components/ui/FieldRenderer"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"

type SiteDetail = {
  id: number
  ckt_id: string
  project_key: string
  subproject_id: number
  receiving_date: string
  status_key: string
  fields: Record<string, unknown>
  financials: { budget: string; cost: string; paid: string; balance: string }
  fe_rows: Array<{ fe_id: number; fe_label: string; bucket_key: string; active: boolean; cost: string; paid: string; balance: string }>
}

type UIField = FieldDefinition & {
  id?: number
  list_view?: boolean
}

type Badge = {
  id: number
  key: string
  label: string
  color: string | null
  type: string
}

type TransitionRow = {
  transition_type: string
  field_key: string
  from_id: number
  from_key: string
  from_label: string
  to_id: number
  to_key: string
  to_label: string
}

type StateRow = {
  id: number
  label: string
}

type ProjectRow = {
  id: number
  key: string
  label: string
}

type UserRow = {
  id: number
  label: string
  username: string
  roles: Array<{ dept_key: string; project_id: number | null }>
}

type JobBucket = {
  id: number
  key: string
  label: string
}

type ProviderRow = {
  id: number
  name: string
}

type UpdateRow = {
  id: number
  date: string
  update: string
  followup_date?: string | null
}

type TicketRow = {
  id: number
  project_id: number
  site_id: number
  ticket_date: string
  rfo?: string | null
  closing_date?: string | null
}

type TransactionRow = {
  id: number
  project_id: number
  site_id?: number | null
  request_date: string
  recipient_id?: number | null
  bucket_key?: string | null
  type_id: number
  amount: string
  status_id: number
  remarks?: string | null
}

type TransactionDraft = {
  open: boolean
  type_id: string
  amount: string
  remarks: string
}

const READ_ONLY_FIELDS = new Set(["budget", "cost", "paid", "balance"])
const TODAY = new Date().toISOString().slice(0, 10)

export default function SiteDetailPage() {
  const { projectKey = "mi", siteId = "0" } = useParams()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [uiFields, setUiFields] = useState<UIField[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [transitions, setTransitions] = useState<TransitionRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [jobBuckets, setJobBuckets] = useState<JobBucket[]>([])
  const [updates, setUpdates] = useState<UpdateRow[]>([])
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, string | boolean>>({})
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, TransactionDraft>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingFields, setSavingFields] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [updatingBadgeKey, setUpdatingBadgeKey] = useState("")
  const [updateForm, setUpdateForm] = useState({ date: TODAY, update: "", followup_date: "" })
  const [ticketForm, setTicketForm] = useState({ ticket_date: TODAY, rfo: "" })
  const [assignmentForm, setAssignmentForm] = useState({ bucket_id: "", fe_id: "" })
  const [removeModal, setRemoveModal] = useState<{ open: boolean; fe_id: number; bucket_id: number; fe_label: string; final_cost: string }>({ open: false, fe_id: 0, bucket_id: 0, fe_label: "", final_cost: "" })
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [providerDraft, setProviderDraft] = useState("")
  const [savingProvider, setSavingProvider] = useState(false)

  async function loadPage() {
    setLoading(true)
    setError("")
    try {
      const numericSiteId = Number(siteId)
      const [
        siteResponse,
        uiFieldsResponse,
        badgesResponse,
        transitionResponse,
        statesResponse,
        projectsResponse,
        usersResponse,
        bucketsResponse,
        updatesResponse,
        ticketsResponse,
        transactionsResponse,
        providersResponse,
      ] = await Promise.all([
        api.get(`/sites/${projectKey}/${siteId}`),
        api.get(`/projects/${projectKey}/ui-fields`),
        api.get("/badges"),
        api.get(`/projects/${projectKey}/badge-transitions`),
        api.get("/indian-states"),
        api.get("/projects"),
        api.get("/users"),
        api.get(`/projects/${projectKey}/job-buckets`),
        api.get("/updates", { params: { site_id: numericSiteId } }),
        api.get("/tickets"),
        api.get("/transactions"),
        api.get(`/projects/${projectKey}/providers`),
      ])

      const nextProjects = projectsResponse.data as ProjectRow[]
      const project = projectByKey(nextProjects, projectKey)
      const nextTickets = (ticketsResponse.data as TicketRow[]).filter((row) => row.project_id === project?.id && row.site_id === numericSiteId)
      const nextTransactions = (transactionsResponse.data as TransactionRow[]).filter((row) => row.project_id === project?.id && row.site_id === numericSiteId)
      const nextSite = siteResponse.data as SiteDetail
      const nextUiFields = (uiFieldsResponse.data as Array<{ key: string; label: string; type?: string; list_view?: boolean }>).map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        list_view: field.list_view,
      }))

      const nextProviders = (providersResponse.data as ProviderRow[]) ?? []
      setSite(nextSite)
      setUiFields(nextUiFields)
      setBadges(badgesResponse.data)
      setTransitions(transitionResponse.data)
      setStates(statesResponse.data)
      setProjects(nextProjects)
      setUsers(usersResponse.data)
      setJobBuckets(bucketsResponse.data)
      setUpdates(updatesResponse.data)
      setTickets(nextTickets)
      setTransactions(nextTransactions)
      setProviders(nextProviders)
      const currentProviderId = nextSite.fields?.provider_id
      setProviderDraft(currentProviderId != null ? String(currentProviderId) : "")
      setDrafts(buildDrafts(nextSite, nextUiFields))
    } catch {
      setError("Unable to load site details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
  }, [projectKey, siteId])

  useEffect(() => {
    if (jobBuckets.length === 1) {
      setAssignmentForm((current) => ({ ...current, bucket_id: String(jobBuckets[0].id) }))
    }
  }, [jobBuckets])

  const badgeById = useMemo(() => new Map(badges.map((badge) => [badge.id, badge])), [badges])
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states])
  const project = useMemo(() => projectByKey(projects, projectKey), [projectKey, projects])
  const transactionTypes = useMemo(() => badges.filter((badge) => badge.type === "transaction"), [badges])
  const badgeFields = useMemo(() => uiFields.filter((field) => field.type === "badge"), [uiFields])
  const regularFields = useMemo(() => uiFields.filter((field) => field.type !== "badge"), [uiFields])
  const foUsers = useMemo(
    () =>
      users.filter((user) =>
        user.roles.some((role) => role.dept_key === "fo" && (role.project_id == null || role.project_id === project?.id)),
      ),
    [project?.id, users],
  )

  if (loading) {
    return <div className="glass-panel p-6">Loading site details...</div>
  }

  if (!site) {
    return <div className="glass-panel p-6">Site not found.</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  const currentSite = site

  async function saveFields() {
    const editableFields = regularFields.filter((field) => !READ_ONLY_FIELDS.has(field.key))
    const payload = Object.fromEntries(
      editableFields
        .filter((field) => isFieldChanged(currentSite, field, drafts[field.key]))
        .map((field) => [field.key, drafts[field.key]]),
    )
    if (!Object.keys(payload).length) {
      return
    }
    setSavingFields(true)
    setSaveError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, { data: payload })
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(detail ?? "Save failed.")
    } finally {
      setSavingFields(false)
    }
  }

  async function transitionBadge(fieldKey: string, toId: number) {
    setUpdatingBadgeKey(fieldKey)
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, { data: { [fieldKey]: toId } })
      await loadPage()
    } finally {
      setUpdatingBadgeKey("")
    }
  }

  async function submitFeTransaction(feId: number, bucketKey: string) {
    const draftKey = transactionDraftKey(feId, bucketKey)
    const draft = transactionDrafts[draftKey]
    if (!draft || !project?.id || !draft.type_id || !draft.amount) {
      return
    }
    await api.post("/transactions", {
      project_id: project.id,
      site_id: currentSite.id,
      recipient_id: feId,
      bucket_key: bucketKey,
      type_id: Number(draft.type_id),
      amount: draft.amount,
      remarks: draft.remarks || null,
    })
    setTransactionDrafts((current) => ({
      ...current,
      [draftKey]: { open: false, type_id: "", amount: "", remarks: "" },
    }))
    await loadPage()
  }

  async function saveProvider() {
    if (!providerDraft) return
    setSavingProvider(true)
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, { data: { provider_id: Number(providerDraft) } })
      await loadPage()
    } finally {
      setSavingProvider(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{project?.label ?? projectKey.toUpperCase()}</p>
            <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{currentSite.ckt_id}</h1>
            <div className="mt-2 text-sm text-jscolors-text/58">Site #{currentSite.id}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            {badgeFields.map((field) => {
              const badgeValue = getFieldValue(currentSite, field)
              const currentBadge = typeof badgeValue === "number" ? badgeById.get(badgeValue) : null
              const nextTransitions = typeof badgeValue === "number" ? transitionOptions(transitions, field.key, badgeValue) : []
              return (
                <div key={field.key} className="min-w-[220px] rounded-[22px] border border-jscolors-crimson/10 bg-white/90 px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
                  <div className="mt-3">
                    <FieldRenderer type="badge" value={currentBadge ?? selectedBadgeFallback(badgeValue)} />
                  </div>
                  {nextTransitions.length ? (
                    <select
                      value=""
                      disabled={updatingBadgeKey === field.key}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        if (!nextValue) return
                        void transitionBadge(field.key, Number(nextValue))
                      }}
                      className="mt-3 w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Transition to</option>
                      {nextTransitions.map((transition) => (
                        <option key={`${field.key}-${transition.to_id}`} value={transition.to_id}>{transition.to_label}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">All Site Fields</p>
            <div className="flex items-center gap-3">
              {saveError ? <span className="text-sm text-red-600">{saveError}</span> : null}
              <button type="button" className="premium-button" disabled={savingFields} onClick={() => void saveFields()}>
                {savingFields ? "Saving..." : "Save Fields"}
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {regularFields.map((field) => {
              const displayValue = displayValueForField(currentSite, field, badgeById, stateById)
              const isReadOnly = READ_ONLY_FIELDS.has(field.key)
              return (
                <div key={field.key} className="rounded-[22px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
                  {isReadOnly ? (
                    <div className="mt-3 text-sm text-jscolors-text">
                      <FieldRenderer field={field} value={displayValue} />
                    </div>
                  ) : (
                    <div className="mt-3">
                      <FieldRenderer
                        mode="input"
                        field={{ ...field, options: optionsForField(field, states) }}
                        value={drafts[field.key] ?? draftValueForField(currentSite, field)}
                        onChange={(value) => setDrafts((current) => ({ ...current, [field.key]: value }))}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6">
          <ActionPanel title="Add Update">
            <div className="grid gap-3">
              <input
                type="date"
                value={updateForm.date}
                onChange={(event) => setUpdateForm((current) => ({ ...current, date: event.target.value }))}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              />
              <textarea
                value={updateForm.update}
                onChange={(event) => setUpdateForm((current) => ({ ...current, update: event.target.value }))}
                placeholder="Update"
                rows={3}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              />
              <input
                type="date"
                value={updateForm.followup_date}
                onChange={(event) => setUpdateForm((current) => ({ ...current, followup_date: event.target.value }))}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              />
              <button
                type="button"
                className="premium-button"
                onClick={() => {
                  void api
                    .post("/updates", {
                      project_id: project?.id,
                      site_id: currentSite.id,
                      date: updateForm.date,
                      update: updateForm.update,
                      followup_date: updateForm.followup_date || null,
                    })
                    .then(() => {
                      setUpdateForm({ date: TODAY, update: "", followup_date: "" })
                      return loadPage()
                    })
                }}
              >
                Add Update
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {updates.length ? updates.map((row) => (
                <InfoRow key={row.id} title={row.date} text={`${row.update}${row.followup_date ? ` • Follow-up ${row.followup_date}` : ""}`} />
              )) : <EmptyState text="No updates yet" />}
            </div>
          </ActionPanel>

          <ActionPanel title="Add Ticket">
            <div className="grid gap-3">
              <input
                type="date"
                value={ticketForm.ticket_date}
                onChange={(event) => setTicketForm((current) => ({ ...current, ticket_date: event.target.value }))}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              />
              <textarea
                value={ticketForm.rfo}
                onChange={(event) => setTicketForm((current) => ({ ...current, rfo: event.target.value }))}
                placeholder="Reason / ticket note"
                rows={3}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              />
              <button
                type="button"
                className="premium-button"
                onClick={() => {
                  void api
                    .post("/tickets", {
                      project_id: project?.id,
                      site_id: currentSite.id,
                      ticket_date: ticketForm.ticket_date,
                      rfo: ticketForm.rfo || null,
                    })
                    .then(() => {
                      setTicketForm({ ticket_date: TODAY, rfo: "" })
                      return loadPage()
                    })
                }}
              >
                Add Ticket
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {tickets.length ? tickets.map((row) => (
                <div key={row.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-jscolors-text">{row.ticket_date}</div>
                      <div className="mt-1 text-sm text-jscolors-text/60">{row.rfo || "Open ticket"}</div>
                    </div>
                    {!row.closing_date && (
                      <button
                        type="button"
                        className="premium-button-secondary shrink-0"
                        onClick={() => {
                          void api.patch(`/tickets/${row.id}/close`).then(() => loadPage())
                        }}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              )) : <EmptyState text="No tickets" />}
            </div>
          </ActionPanel>

          {projectKey === "bb" ? (
            <ActionPanel title="Provider">
              <div className="grid gap-3">
                <select
                  value={providerDraft}
                  onChange={(event) => setProviderDraft(event.target.value)}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  <option value="">Select Provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button type="button" className="premium-button" disabled={savingProvider || !providerDraft} onClick={() => void saveProvider()}>
                  {savingProvider ? "Saving..." : "Set Provider"}
                </button>
              </div>
              {providers.length === 0 && <EmptyState text="No providers configured" />}
            </ActionPanel>
          ) : (
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
                      .then(() => loadPage())
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
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, bucket_id: event.target.value }))}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  <option value="">Select Bucket</option>
                  {jobBuckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>{bucket.label}</option>
                  ))}
                </select>
              )}
              <select
                value={assignmentForm.fe_id}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, fe_id: event.target.value }))}
                className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              >
                <option value="">Select FE</option>
                {foUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.label}</option>
                ))}
              </select>
            </div>
            {(() => {
              const alreadyAssigned =
                !!assignmentForm.bucket_id &&
                currentSite.fe_rows.some(
                  (r) =>
                    r.active &&
                    r.bucket_key === jobBuckets.find((b) => String(b.id) === assignmentForm.bucket_id)?.key,
                )
              return (
                <button
                  type="button"
                  className="premium-button mt-3"
                  disabled={alreadyAssigned}
                  title={alreadyAssigned ? "An active FE is already assigned to this bucket" : undefined}
                  onClick={() => {
                    if (!assignmentForm.bucket_id || !assignmentForm.fe_id) return
                    void api
                      .post(`/sites/${projectKey}/${currentSite.id}/assignments`, { bucket_id: Number(assignmentForm.bucket_id), fe_id: Number(assignmentForm.fe_id) })
                      .then(() => {
                        setAssignmentForm({ bucket_id: "", fe_id: "" })
                        return loadPage()
                      })
                  }}
                >
                  {alreadyAssigned ? "Bucket Already Assigned" : "Assign FE"}
                </button>
              )
            })()}
            <div className="mt-4 space-y-3">
              {currentSite.fe_rows.length ? currentSite.fe_rows.map((row) => {
                const draftKey = transactionDraftKey(row.fe_id, row.bucket_key)
                const draft = transactionDrafts[draftKey] ?? { open: false, type_id: "", amount: "", remarks: "" }
                const rowTransactions = transactions.filter((transaction) => transaction.recipient_id === row.fe_id && transaction.bucket_key === row.bucket_key)
                return (
                  <div key={`${row.fe_id}-${row.bucket_key}`} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-jscolors-text">{row.fe_label} · {bucketLabel(jobBuckets, row.bucket_key)}</div>
                        <div className="mt-1 text-sm text-jscolors-text/60">Cost {row.cost} • Paid {row.paid} • Balance {row.balance}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="premium-button-secondary"
                          onClick={() =>
                            setTransactionDrafts((current) => ({
                              ...current,
                              [draftKey]: { ...draft, open: !draft.open },
                            }))
                          }
                        >
                          Request Transaction
                        </button>
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
                            onChange={(event) =>
                              setTransactionDrafts((current) => ({
                                ...current,
                                [draftKey]: { ...draft, type_id: event.target.value },
                              }))
                            }
                            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                          >
                            <option value="">Select Type</option>
                            {transactionTypes.map((type) => (
                              <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={draft.amount}
                            onChange={(event) =>
                              setTransactionDrafts((current) => ({
                                ...current,
                                [draftKey]: { ...draft, amount: event.target.value },
                              }))
                            }
                            placeholder="Amount"
                            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                          />
                        </div>
                        <textarea
                          value={draft.remarks}
                          onChange={(event) =>
                            setTransactionDrafts((current) => ({
                              ...current,
                              [draftKey]: { ...draft, remarks: event.target.value },
                            }))
                          }
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
                      {rowTransactions.length ? rowTransactions.map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          row={transaction}
                          badges={badgeById}
                          transitions={transitionOptions(transitions, "transaction_status", transaction.status_id)}
                          onTransition={(toId) => api.patch(`/transactions/${transaction.id}/status`, { status_id: toId }).then(() => loadPage())}
                        />
                      )) : <EmptyState text="No transactions for this FE yet" />}
                    </div>
                  </div>
                )
              }) : <EmptyState text={foUsers.length ? "No FE assignments yet" : "No FO users available for this project"} />}
            </div>
            {transactions.some((transaction) => !transaction.recipient_id || !transaction.bucket_key) ? (
              <div className="mt-4 space-y-3">
                {transactions.filter((transaction) => !transaction.recipient_id || !transaction.bucket_key).map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    row={transaction}
                    badges={badgeById}
                    transitions={transitionOptions(transitions, "transaction_status", transaction.status_id)}
                    onTransition={(toId) => api.patch(`/transactions/${transaction.id}/status`, { status_id: toId }).then(() => loadPage())}
                  />
                ))}
              </div>
            ) : null}
          </ActionPanel>
          )}
        </section>
      </div>
    </div>
  )
}

function buildDrafts(site: SiteDetail, fields: UIField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, draftValueForField(site, field)]))
}

function draftValueForField(site: SiteDetail, field: UIField): string | boolean {
  const value = getFieldValue(site, field)
  if (field.type === "bool") {
    return Boolean(value)
  }
  return value == null ? "" : String(value)
}

function getFieldValue(site: SiteDetail, field: UIField) {
  if (field.key in site.financials) {
    return site.financials[field.key as keyof SiteDetail["financials"]]
  }
  if (field.key in site.fields) {
    return site.fields[field.key]
  }
  const suffixedKey = `${field.key}_id`
  if (suffixedKey in site.fields) {
    return site.fields[suffixedKey]
  }
  return null
}

function displayValueForField(site: SiteDetail, field: UIField, badgeById: Map<number, Badge>, stateById: Map<number, StateRow>) {
  const value = getFieldValue(site, field)
  if (field.type === "dropdown" && field.key === "state_id" && typeof value === "number") {
    return stateById.get(value)?.label ?? value
  }
  if (field.type === "badge" && typeof value === "number") {
    return badgeById.get(value)
  }
  return value
}

function optionsForField(field: UIField, states: StateRow[]) {
  if (field.key === "state_id") {
    return states.map((state) => ({ label: state.label, value: state.id }))
  }
  return field.options
}

function isFieldChanged(site: SiteDetail, field: UIField, nextValue: string | boolean | undefined) {
  return draftValueForField(site, field) !== (nextValue ?? "")
}

function transitionOptions(transitions: TransitionRow[], fieldKey: string, fromId: number) {
  return transitions.filter((transition) => transition.field_key === fieldKey && transition.from_id === fromId)
}

function selectedBadgeFallback(value: unknown) {
  if (value == null || value === "") {
    return "-"
  }
  return String(value)
}

function transactionDraftKey(feId: number, bucketKey: string) {
  return `${feId}:${bucketKey}`
}

function bucketLabel(jobBuckets: JobBucket[], bucketKey: string) {
  return jobBuckets.find((bucket) => bucket.key === bucketKey)?.label ?? bucketKey.toUpperCase()
}

function projectByKey(projects: ProjectRow[], key: string) {
  return projects.find((project) => project.key === key) ?? null
}

function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function TransactionCard({
  row,
  badges,
  transitions,
  onTransition,
}: {
  row: TransactionRow
  badges: Map<number, Badge>
  transitions: TransitionRow[]
  onTransition: (toId: number) => Promise<unknown>
}) {
  const [updating, setUpdating] = useState(false)
  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold text-jscolors-text">{badges.get(row.type_id)?.label ?? "Transaction"} • {row.amount}</div>
          <div className="mt-1 text-sm text-jscolors-text/60">
            {row.request_date}
            {row.bucket_key ? ` • ${row.bucket_key.toUpperCase()}` : ""}
            {row.remarks ? ` • ${row.remarks}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FieldRenderer type="badge" value={badges.get(row.status_id) ?? "-"} />
          {transitions.length ? (
            <select
              value=""
              disabled={updating}
              onChange={(event) => {
                const nextValue = event.target.value
                if (!nextValue) return
                setUpdating(true)
                void onTransition(Number(nextValue)).finally(() => setUpdating(false))
              }}
              className="rounded-2xl border border-jscolors-crimson/15 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Change to</option>
              {transitions.map((transition) => (
                <option key={`${row.id}-${transition.to_id}`} value={transition.to_id}>{transition.to_label}</option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="text-sm font-semibold text-jscolors-text">{title}</div>
      <div className="mt-1 text-sm text-jscolors-text/60">{text}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
}
