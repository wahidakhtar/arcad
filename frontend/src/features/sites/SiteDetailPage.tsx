import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import FieldRenderer from "../../components/ui/FieldRenderer"
import BadgeDropdown from "../../components/ui/BadgeDropdown"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import type { Badge, ProjectRow, SiteDetail, StateRow, TicketRow, TransactionRow, TransitionRow, UIField, UpdateRow, UserRow, JobBucket, ProviderRow } from "./siteDetailTypes"
import {
  DOC_BADGE_FIELDS,
  READ_ONLY_FIELDS,
  buildDrafts,
  displayValueForField,
  draftValueForField,
  fieldVisible,
  getFieldValue,
  isFieldChanged,
  optionsForField,
  projectByKey,
  selectedBadgeFallback,
  transitionOptions,
} from "./siteDetailHelpers"
import SiteUpdatesSection from "./SiteUpdatesSection"
import SiteTicketsSection from "./SiteTicketsSection"
import SiteFEAssignmentSection from "./SiteFEAssignmentSection"

export default function SiteDetailPage() {
  const { tags } = useAuth()
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
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingFields, setSavingFields] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [updatingBadgeKey, setUpdatingBadgeKey] = useState("")

  async function loadPage() {
    setLoading(true)
    setError("")
    try {
      const numericSiteId = Number(siteId)
      const empty = { data: [] }
      const [
        siteResponse, uiFieldsResponse, badgesResponse, transitionResponse,
        statesResponse, projectsResponse, usersResponse, bucketsResponse,
        updatesResponse, ticketsResponse, transactionsResponse, providersResponse,
      ] = await Promise.all([
        api.get(`/sites/${projectKey}/${siteId}`),
        api.get(`/projects/${projectKey}/ui-fields`),
        api.get("/badges"),
        api.get(`/projects/${projectKey}/badge-transitions`),
        api.get("/indian-states"),
        api.get("/projects"),
        api.get("/users").catch(() => empty),
        api.get(`/projects/${projectKey}/job-buckets`),
        api.get("/updates", { params: { site_id: numericSiteId } }).catch(() => empty),
        api.get("/tickets").catch(() => empty),
        api.get("/transactions").catch(() => empty),
        api.get(`/projects/${projectKey}/providers`),
      ])
      const nextProjects = projectsResponse.data as ProjectRow[]
      const project = projectByKey(nextProjects, projectKey)
      const nextTickets = (ticketsResponse.data as TicketRow[]).filter(
        (row) => row.project_id === project?.id && row.site_id === numericSiteId,
      )
      const nextTransactions = (transactionsResponse.data as TransactionRow[]).filter(
        (row) => row.project_id === project?.id && row.site_id === numericSiteId,
      )
      const nextSite = siteResponse.data as SiteDetail
      const nextUiFields = (uiFieldsResponse.data as Array<{ key: string; label: string; type?: string; list_view?: boolean; perm_tag?: string | null }>).map(
        (field) => ({ key: field.key, label: field.label, type: field.type, list_view: field.list_view, perm_tag: field.perm_tag }),
      )
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
      setProviders((providersResponse.data as ProviderRow[]) ?? [])
      setDrafts(buildDrafts(nextSite, nextUiFields))
    } catch {
      setError("Unable to load site details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPage() }, [projectKey, siteId])

  const badgeById = useMemo(() => new Map(badges.map((b) => [b.id, b])), [badges])
  const stateById = useMemo(() => new Map(states.map((s) => [s.id, s])), [states])
  const project = useMemo(() => projectByKey(projects, projectKey), [projectKey, projects])
  const transactionTypes = useMemo(() => badges.filter((b) => b.type === "transaction"), [badges])

  const visibleFields = useMemo(
    () => uiFields.filter((f) => fieldVisible(f.perm_tag, tags)),
    [uiFields, tags],
  )
  const badgeFields = useMemo(() => visibleFields.filter((f) => f.type === "badge"), [visibleFields])
  const regularFields = useMemo(() => visibleFields.filter((f) => f.type !== "badge"), [visibleFields])

  const foUsers = useMemo(
    () => users.filter((u) => u.roles.some((r) => r.dept_key === "fo" && (r.project_id == null || r.project_id === project?.id))),
    [project?.id, users],
  )

  if (loading) return <div className="glass-panel p-6">Loading site details...</div>
  if (!site) return <div className="glass-panel p-6">Site not found.</div>
  if (error) return <div className="glass-panel p-6 text-red-700">{error}</div>

  const currentSite = site
  const canSiteWrite = tags.site?.write === true
  const canRequestWrite = tags.request?.write === true
  const canTransactionWrite = tags.transaction?.write === true
  const cancelBadge = badges.find((b) => b.key === "cancel")
  const cancelBadgeId = cancelBadge?.id
  const reqBadge = badges.find((b) => b.key === "req")
  const reqBadgeId = reqBadge?.id
  const docBadgeEditable = tags.doc_badge?.write === true
  const canAddUpdate = tags.update?.write === true || tags.acc_update?.write === true
  const canReadOpsUpdates = tags.update?.read === true
  const canReadAccUpdates = tags.acc_update?.read === true
  const outcomeId = typeof currentSite.fields.outcome === "number" ? currentSite.fields.outcome :
    typeof currentSite.fields.outcome_id === "number" ? currentSite.fields.outcome_id : null
  const isAssetTransfer = outcomeId !== null && badgeById.get(outcomeId as number)?.label?.toLowerCase() === "asset transfer"

  async function saveFields() {
    const editableFields = regularFields.filter((f) => !READ_ONLY_FIELDS.has(f.key))
    const payload = Object.fromEntries(
      editableFields.filter((f) => isFieldChanged(currentSite, f, drafts[f.key])).map((f) => [f.key, drafts[f.key]]),
    )
    if (!Object.keys(payload).length) return
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
              if (field.key === "tx_copy_status" && !isAssetTransfer) return null
              const badgeValue = getFieldValue(currentSite, field)
              const currentBadge = typeof badgeValue === "number" ? badgeById.get(badgeValue) : null
              const isDocBadge = DOC_BADGE_FIELDS.has(field.key)
              const nextTransitions = (!isDocBadge || docBadgeEditable) && typeof badgeValue === "number"
                ? transitionOptions(transitions, field.key, badgeValue)
                : []
              return (
                <div key={field.key} className="min-w-[220px] rounded-[22px] border border-jscolors-crimson/10 bg-white/90 px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
                  <div className="mt-3">
                    <BadgeDropdown
                      badge={currentBadge ?? null}
                      fallback={String(selectedBadgeFallback(badgeValue))}
                      options={nextTransitions.map((t) => ({ id: t.to_id, label: t.to_label, color: badgeById.get(t.to_id)?.color ?? null }))}
                      onSelect={(toId) => void transitionBadge(field.key, toId)}
                      disabled={updatingBadgeKey === field.key}
                    />
                  </div>
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
            {canSiteWrite && (
              <div className="flex items-center gap-3">
                {saveError ? <span className="text-sm text-red-600">{saveError}</span> : null}
                <button type="button" className="premium-button" disabled={savingFields} onClick={() => void saveFields()}>
                  {savingFields ? "Saving..." : "Save Fields"}
                </button>
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {regularFields.map((field) => {
              const displayValue = displayValueForField(currentSite, field, badgeById, stateById)
              const isReadOnly = READ_ONLY_FIELDS.has(field.key)
              return (
                <div key={field.key} className="rounded-[22px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
                  {isReadOnly || !canSiteWrite ? (
                    <div className="mt-3 text-sm text-jscolors-text"><FieldRenderer field={field} value={displayValue} /></div>
                  ) : (
                    <div className="mt-3">
                      <FieldRenderer
                        mode="input"
                        field={{ ...field, options: optionsForField(field, states) }}
                        value={drafts[field.key] ?? draftValueForField(currentSite, field)}
                        onChange={(value) => setDrafts((c) => ({ ...c, [field.key]: value }))}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6">
          <SiteUpdatesSection
            updates={updates}
            canReadOpsUpdates={canReadOpsUpdates}
            canReadAccUpdates={canReadAccUpdates}
            canAddUpdate={canAddUpdate}
            projectId={project?.id}
            siteId={currentSite.id}
            onReload={loadPage}
          />
          <SiteTicketsSection
            tickets={tickets}
            canTicketRead={tags.ticket?.read === true}
            canTicketWrite={tags.ticket?.write === true}
            projectId={project?.id}
            siteId={currentSite.id}
            onReload={loadPage}
          />
          <SiteFEAssignmentSection
            currentSite={currentSite}
            projectKey={projectKey}
            project={project}
            jobBuckets={jobBuckets}
            foUsers={foUsers}
            transactions={transactions}
            badgeById={badgeById}
            transactionTypes={transactionTypes}
            transitions={transitions}
            reqBadgeId={reqBadgeId}
            cancelBadgeId={cancelBadgeId}
            canRequestWrite={canRequestWrite}
            canTransactionWrite={canTransactionWrite}
            canSiteWrite={canSiteWrite}
            providers={providers}
            onReload={loadPage}
          />
        </section>
      </div>
    </div>
  )
}
