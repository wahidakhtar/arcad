import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import Button from "../../components/ui/Button"
import DetailFieldCard from "../../components/ui/DetailFieldCard"
import FieldRenderer from "../../components/ui/FieldRenderer"
import BadgeDropdown from "../../components/ui/BadgeDropdown"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import type { Badge, ProjectRow, SiteDetail, StateRow, TicketRow, TransactionRow, TransitionRow, UIField, UpdateRow, JobBucket, SubconRow } from "./siteDetailTypes"
import {
  DOC_BADGE_FIELDS,
  READ_ONLY_FIELDS,
  displayValueForField,
  draftValueForField,
  getFieldValue,
  optionsForField,
  projectByKey,
  selectedBadgeFallback,
  transitionOptions,
} from "./siteDetailHelpers"
import SiteUpdatesSection from "./SiteUpdatesSection"
import SiteTicketsSection from "./SiteTicketsSection"
import SiteFEAssignmentSection from "./SiteFEAssignmentSection"

export default function SiteDetailPage() {
  const { can, canPermTag } = useAuth()
  const { projectKey = "mi", siteId = "0" } = useParams()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [uiFields, setUiFields] = useState<UIField[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [transitions, setTransitions] = useState<TransitionRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [jobBuckets, setJobBuckets] = useState<JobBucket[]>([])
  const [updates, setUpdates] = useState<UpdateRow[]>([])
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [subcons, setSubcons] = useState<SubconRow[]>([])
  const [transactionTypes, setTransactionTypes] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingField, setEditingField] = useState<{ field: UIField; draft: string | boolean } | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [updatingBadgeKey, setUpdatingBadgeKey] = useState("")

  async function loadPage() {
    setLoading(true)
    setError("")
    try {
      const numericSiteId = Number(siteId)
      const empty = { data: [] }
      const [
        siteResponse, uiFieldsResponse, badgesResponse, transitionResponse,
        statesResponse, projectsResponse, bucketsResponse,
        updatesResponse, ticketsResponse, transactionsResponse, subconsResponse,
        txTypesResponse,
      ] = await Promise.all([
        api.get(`/sites/${projectKey}/${siteId}`),
        api.get(`/projects/${projectKey}/ui-fields`),
        api.get("/badges"),
        api.get(`/projects/${projectKey}/badge-transitions`),
        api.get("/indian-states"),
        api.get("/projects"),
        api.get(`/projects/${projectKey}/job-buckets`),
        api.get("/updates", { params: { site_id: numericSiteId } }).catch(() => empty),
        api.get("/tickets").catch(() => empty),
        api.get("/transactions").catch(() => empty),
        api.get(`/projects/${projectKey}/subcons`).catch(() => empty),
        api.get(`/projects/${projectKey}/transaction-types`).catch(() => empty),
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
      setJobBuckets(bucketsResponse.data)
      setUpdates(updatesResponse.data)
      setTickets(nextTickets)
      setTransactions(nextTransactions)
      setSubcons((subconsResponse.data as SubconRow[]) ?? [])
      setTransactionTypes(Array.isArray(txTypesResponse.data) ? txTypesResponse.data as Badge[] : [])
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

  const visibleFields = useMemo(
    () => uiFields.filter((f) => canPermTag(f.perm_tag)),
    [uiFields, canPermTag],
  )
  const badgeFields = useMemo(() => visibleFields.filter((f) => f.type === "badge"), [visibleFields])
  const regularFields = useMemo(() => visibleFields.filter((f) => f.type !== "badge"), [visibleFields])

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading site details...</div>
  if (!site) return <div className="p-6 text-jscolors-text/50">Site not found.</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  const currentSite = site
  const canSiteWrite = can("site", "write")
  const canRequestWrite = can("request", "write")
  const canTransactionWrite = can("transaction", "write")
  const cancelBadge = badges.find((b) => b.key === "cancel")
  const cancelBadgeId = cancelBadge?.id
  const reqBadge = badges.find((b) => b.key === "req")
  const reqBadgeId = reqBadge?.id
  const docBadgeEditable = can("doc_badge", "write")
  const canAddUpdate = can("update", "write") || can("acc_update", "write")
  const canReadOpsUpdates = can("update", "read")
  const canReadAccUpdates = can("acc_update", "read")
  const outcomeId = typeof currentSite.fields.outcome === "number" ? currentSite.fields.outcome :
    typeof currentSite.fields.outcome_id === "number" ? currentSite.fields.outcome_id : null
  const isAssetTransfer = outcomeId !== null && badgeById.get(outcomeId as number)?.label?.toLowerCase() === "asset transfer"

  async function saveFieldEdit() {
    if (!editingField) return
    setEditSaving(true)
    setEditError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, { data: { [editingField.field.key]: editingField.draft } })
      setEditingField(null)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setEditError(detail ?? "Save failed.")
    } finally {
      setEditSaving(false)
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
    <div className="flex flex-col h-full">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-4">
        {badgeFields.map((field) => {
          if (field.key === "tx_copy_status" && !isAssetTransfer) return null
          const badgeValue = getFieldValue(currentSite, field)
          const currentBadge = typeof badgeValue === "number" ? badgeById.get(badgeValue) : null
          const isDocBadge = DOC_BADGE_FIELDS.has(field.key)
          const nextTransitions = (!isDocBadge || docBadgeEditable) && typeof badgeValue === "number"
            ? transitionOptions(transitions, field.key, badgeValue)
            : []
          return (
            <div key={field.key} className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
              <div className="mt-2">
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

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Details</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {regularFields.map((field) => {
              const displayValue = displayValueForField(currentSite, field, badgeById, stateById)
              const isReadOnly = READ_ONLY_FIELDS.has(field.key)
              const rawVal = draftValueForField(currentSite, field)
              const isEmpty = field.type !== "bool" && (rawVal === "" || rawVal === null || rawVal === undefined)
              return (
                <DetailFieldCard
                  key={field.key}
                  label={field.label}
                  value={<FieldRenderer field={field} value={displayValue} />}
                  onAdd={canSiteWrite && !isReadOnly && isEmpty ? () => {
                    setEditingField({ field, draft: typeof rawVal === "boolean" ? rawVal : String(rawVal ?? "") })
                    setEditError("")
                  } : undefined}
                  onEdit={canSiteWrite && !isReadOnly && !isEmpty ? () => {
                    setEditingField({ field, draft: typeof rawVal === "boolean" ? rawVal : String(rawVal ?? "") })
                    setEditError("")
                  } : undefined}
                />
              )
            })}
          </div>
        </section>

        <Modal open={editingField !== null} title={editingField?.field.label ?? "Edit"} onClose={() => setEditingField(null)} size="sm">
          {editingField ? (
            <div className="space-y-4">
              <FieldRenderer
                mode="input"
                field={{ ...editingField.field, options: optionsForField(editingField.field, states) }}
                value={editingField.draft}
                onChange={(value) => setEditingField((c) => c ? { ...c, draft: value } : null)}
              />
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
              <Button
                type="button"
                className="w-full"
                disabled={editSaving}
                onClick={() => void saveFieldEdit()}
              >
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </Modal>

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
            canTicketRead={can("ticket", "read")}
            canTicketWrite={can("ticket", "write")}
            projectId={project?.id}
            siteId={currentSite.id}
            onReload={loadPage}
          />
          <SiteFEAssignmentSection
            currentSite={currentSite}
            projectKey={projectKey}
            project={project}
            jobBuckets={jobBuckets}
            subcons={subcons}
            transactions={transactions}
            badgeById={badgeById}
            transactionTypes={transactionTypes}
            transitions={transitions}
            reqBadgeId={reqBadgeId}
            cancelBadgeId={cancelBadgeId}
            canRequestWrite={canRequestWrite}
            canTransactionWrite={canTransactionWrite}
            canSiteWrite={canSiteWrite}
            onReload={loadPage}
          />
        </section>
      </div>
      </div>
    </div>
  )
}
