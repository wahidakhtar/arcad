import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { logError } from "../../../../lib/errorLogger"
import { useParams } from "react-router-dom"

import { useAuth } from "../../../../context/AuthContext"
import { api } from "../../../../lib/api"
import { subscribe } from "../../../../hooks/useWebSocket"
import {
  draftValueForField,
  projectByKey,
  transitionOptions,
} from "../../siteDetailHelpers"
import type {
  Badge,
  JobBucket,
  ProjectRow,
  SiteDetail,
  StateRow,
  SubconRow,
  TicketRow,
  TransactionRow,
  TransitionRow,
  UIField,
  UpdateRow,
} from "../../siteDetailTypes"

type EditingFieldState = {
  field: UIField
  draft: string | boolean
} | null

export default function useSiteDetail() {
  const { canPermTag } = useAuth()
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
  const [outcomes, setOutcomes] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingField, setEditingField] = useState<EditingFieldState>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [updatingBadgeKey, setUpdatingBadgeKey] = useState("")

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const numericSiteId = Number(siteId)
      const empty = { data: [] }
      const [
        siteResponse,
        uiFieldsResponse,
        badgesResponse,
        transitionResponse,
        statesResponse,
        projectsResponse,
        bucketsResponse,
        updatesResponse,
        ticketsResponse,
        transactionsResponse,
        subconsResponse,
        txTypesResponse,
        outcomesResponse,
      ] = await Promise.all([
        api.get(`/sites/${projectKey}/${siteId}`),
        api.get(`/projects/${projectKey}/ui-fields`),
        api.get("/badges"),
        api.get(`/projects/${projectKey}/badge-transitions`),
        api.get("/indian-states"),
        api.get("/projects").catch(() => ({ data: [] })),
        api.get(`/projects/${projectKey}/job-buckets`),
        api.get("/updates", { params: { site_id: numericSiteId } }).catch(() => empty),
        api.get("/tickets").catch(() => empty),
        api.get("/transactions").catch(() => empty),
        api.get(`/projects/${projectKey}/subcons`).catch(() => empty),
        api.get(`/projects/${projectKey}/transaction-types`).catch(() => empty),
        api.get(`/projects/${projectKey}/outcomes`).catch(() => empty),
      ])

      const nextProjects = projectsResponse.data as ProjectRow[]
      const project = projectByKey(nextProjects, projectKey)
      const nextUiFields = (
        uiFieldsResponse.data as Array<{ key: string; label: string; type?: string; list_view?: boolean; tag?: string }>
      ).map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        list_view: field.list_view,
        tag: field.tag,
      }))

      setSite(siteResponse.data as SiteDetail)
      setUiFields(nextUiFields)
      setBadges(Array.isArray(badgesResponse.data) ? badgesResponse.data as Badge[] : [])
      setTransitions(Array.isArray(transitionResponse.data) ? transitionResponse.data as TransitionRow[] : [])
      setStates(Array.isArray(statesResponse.data) ? statesResponse.data as StateRow[] : [])
      setProjects(nextProjects)
      setJobBuckets(Array.isArray(bucketsResponse.data) ? bucketsResponse.data as JobBucket[] : [])
      setUpdates(Array.isArray(updatesResponse.data) ? updatesResponse.data as UpdateRow[] : [])
      setTickets(
        ((ticketsResponse.data as { items?: TicketRow[] })?.items ?? []).filter(
          (row) => row.project_id === project?.id && row.site_id === numericSiteId,
        ),
      )
      setTransactions(
        ((transactionsResponse.data as { items?: TransactionRow[] })?.items ?? []).filter(
          (row) => row.project_id === project?.id && row.site_id === numericSiteId,
        ),
      )
      setSubcons((subconsResponse.data as SubconRow[]) ?? [])
      setTransactionTypes(Array.isArray(txTypesResponse.data) ? txTypesResponse.data as Badge[] : [])
      setOutcomes(Array.isArray(outcomesResponse.data) ? outcomesResponse.data as Array<{ value: string; label: string }> : [])
    } catch (err) {
      logError({
        error_type: "js_exception",
        error_message: (err as Error)?.message ?? String(err),
        stack_trace: (err as Error)?.stack,
      })
      setError("Unable to load site details.")
    } finally {
      setLoading(false)
    }
  }, [projectKey, siteId])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  // WS subscription — refetch only when this specific site is updated
  const lastRefetchRef = useRef(0)
  const safeLoadPage = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    const numericSiteId = Number(siteId)
    const unsub = subscribe("SITE_UPDATED", (e) => {
      const ev = e as { site_id: number; project_key: string }
      if (ev.site_id === numericSiteId && ev.project_key === projectKey) {
        safeLoadPage()
      }
    })
    return unsub
  }, [siteId, projectKey, safeLoadPage])

  const badgeById = useMemo(() => new Map(badges.map((badge) => [badge.id, badge])), [badges])
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states])
  const project = useMemo(() => projectByKey(projects, projectKey), [projectKey, projects])
  const visibleFields = useMemo(() => uiFields.filter((field) => canPermTag(field.tag)), [uiFields, canPermTag])
  const badgeFields = useMemo(() => visibleFields.filter((field) => field.type === "badge"), [visibleFields])
  const regularFields = useMemo(() => visibleFields.filter((field) => field.type !== "badge"), [visibleFields])

  const currentSite = site
  const outcomeId = typeof currentSite?.fields.outcome === "number"
    ? currentSite.fields.outcome
    : typeof currentSite?.fields.outcome_id === "number"
      ? currentSite.fields.outcome_id
      : null
  const isAssetTransfer = outcomeId !== null && badgeById.get(outcomeId as number)?.label?.toLowerCase() === "asset transfer"

  const openFieldEditor = useCallback((field: UIField) => {
    if (!currentSite) return
    const rawValue = draftValueForField(currentSite, field)
    setEditingField({ field, draft: typeof rawValue === "boolean" ? rawValue : String(rawValue ?? "") })
    setEditError("")
  }, [currentSite])

  const saveFieldEdit = useCallback(async () => {
    if (!editingField || !currentSite) return
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
  }, [currentSite, editingField, loadPage, projectKey])

  const transitionBadge = useCallback(async (fieldKey: string, toId: number) => {
    if (!currentSite) return
    setUpdatingBadgeKey(fieldKey)
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, { data: { [fieldKey]: toId } })
      await loadPage()
    } finally {
      setUpdatingBadgeKey("")
    }
  }, [currentSite, loadPage, projectKey])

  return {
    projectKey,
    siteId,
    site,
    loading,
    error,
    badges,
    transitions,
    states,
    project,
    jobBuckets,
    updates,
    tickets,
    transactions,
    subcons,
    transactionTypes,
    outcomes,
    badgeById,
    stateById,
    badgeFields,
    regularFields,
    editingField,
    editSaving,
    editError,
    updatingBadgeKey,
    isAssetTransfer,
    openFieldEditor,
    setEditingField,
    setEditError,
    saveFieldEdit,
    transitionBadge,
    loadPage,
    transitionOptions,
  }
}
