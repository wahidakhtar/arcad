import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import { subscribe } from "../../hooks/useWebSocket"

import DataTable from "../../components/ui/DataTable"
import AddForm from "../../components/ui/AddForm"
import BulkTable from "../../components/ui/BulkTable"
import Button from "../../components/ui/Button"
import FilterBar, { type FilterBarConfig } from "../../components/ui/FilterBar"
import ListPageLayout from "../../components/layout/ListPageLayout"
import Modal from "../../components/ui/Modal"
import { useListPage } from "../../hooks/useListPage"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { formatSubprojectLabel } from "../../lib/subprojects"
import { formatCurrency } from "../../utils/format"

type Badge = {
  id: number
  key: string
  label: string
  color: string | null
  type: string
}

type SiteRow = {
  id: number
  ckt_id: string
  receiving_date: string
  customer?: string
  state_id?: string
  city?: string
  status_key: string
  status_badge?: Badge
  budget?: string | number
  cost?: string | number
  paid?: string | number
  balance?: string | number
}

type UIField = {
  key: string
  label: string
  type?: string
  list_view: boolean
  form_view: boolean
  bulk_view: boolean
  section: string
}

type SiteColumn = {
  key: string
  label: string
  type?: string
  minWidth?: number
  align?: "left" | "right"
}

type Subproject = { id: number; batch_date: string | null; bucket?: boolean }

type ProjectMeta = {
  label: string
  supports_subprojects: boolean
  subprojects: Subproject[]
}

const PROJECT_STATUS_FILTERS: Record<string, string[]> = {
  mi: ["wip", "p_wait", "rect", "cancel", "comp"],
  md: ["wip", "p_wait", "rect", "cancel", "comp"],
  ma: ["wip", "p_wait", "cancel", "comp"],
  mc: ["wip", "p_wait", "p_iss", "a_wait", "rect", "cancel", "comp"],
  bb: ["hold", "down", "live", "term"],
}

function subprojectLabel(sub: Subproject) {
  return formatSubprojectLabel(sub)
}

export default function SiteListPage() {
  const addSiteSubmitRef = useRef<(() => void) | null>(null)
  const addSubprojectSubmitRef = useRef<(() => void) | null>(null)
  const { can, roles, projectKeys } = useAuth()
  const { projectKey = "mi" } = useParams()
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [columns, setColumns] = useState<SiteColumn[]>([])
  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [bulkFields, setBulkFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"deployed" | number>("deployed")
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [openAddModal, setOpenAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<"site" | "subproject">("site")
  const [submitting, setSubmitting] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])
  const [states, setStates] = useState<Array<{ id: number; label: string }>>([])
  const [metaError, setMetaError] = useState("")

  const baseEndpoint =
    activeTab === "deployed"
      ? `/sites/${projectKey}?exclude_staged=true`
      : `/sites/${projectKey}?subproject_id=${activeTab}`

  const buildParams = useCallback(() => ({ search: search.trim() || undefined }), [search])

  const { data: siteData, loading, error, refetch, pagination, page: _page, setPage } = useListPage<SiteRow[]>({
    endpoint: baseEndpoint,
    pageSize: 50,
    buildParams,
  })

  // WS subscription
  useEffect(() => {
    const unsub1 = subscribe("SITE_CREATED", (e) => {
      if ((e as { project_key: string }).project_key === projectKey) refetch()
    })
    const unsub2 = subscribe("SITE_UPDATED", (e) => {
      if ((e as { project_key: string }).project_key === projectKey) refetch()
    })
    return () => { unsub1(); unsub2() }
  }, [projectKey, refetch])

  useEffect(() => {
    setActiveTab("deployed")
    setSelectedBadges([])
    setMetaError("")
    void Promise.all([
      api.get("/badges", { params: { type: "status" } }),
      api.get(`/projects/${projectKey}/ui-fields`),
      api.get("/indian-states"),
      api.get("/projects").catch(() => ({ data: [] })),
    ]).then(([badgesRes, uiFieldsRes, statesRes, projectsRes]) => {
      const statusBadges = badgesRes.data as Badge[]
      const uiFields = uiFieldsRes.data as UIField[]
      const projects = projectsRes.data as Array<{
        key: string; label: string; supports_subprojects: boolean; subprojects: Subproject[]
      }>
      const project = projects.find((p) => p.key === projectKey)
      setBadges(statusBadges)
      setStates(statesRes.data)
      setProjectMeta(
        project
          ? { label: project.label, supports_subprojects: project.supports_subprojects, subprojects: project.subprojects ?? [] }
          : null,
      )
      const listColumns: SiteColumn[] = uiFields
        .filter((field) => field.list_view)
        .map((field) => ({
          key: field.key === "status" ? "status_badge" : field.key,
          label: field.label,
          type: field.type,
          minWidth: field.key === "ckt_id" ? 120 : field.key === "status" ? 140 : field.type === "date" ? 110 : 100,
          ...( ["cost", "paid", "balance"].includes(field.key) ? { align: "right" as const } : {}),
        }))
      setColumns(listColumns)
      setFormFields(uiFields.filter((f) => f.form_view).map(({ key, label, type }) => ({ key, label, type })))
      setBulkFields(uiFields.filter((f) => f.bulk_view).map(({ key, label, type }) => ({ key, label, type })))
    }).catch(() => {
      setMetaError("Unable to load page configuration. Please refresh.")
    })
  }, [projectKey])

  // Reset badge filter on tab change
  useEffect(() => { setSelectedBadges([]) }, [activeTab])

  const badgeByKey = useMemo(() => new Map(badges.map((badge) => [badge.key, badge])), [badges])

  const rows = useMemo(() => {
    const enriched = (siteData ?? []).map((row) => ({ ...row, status_badge: badgeByKey.get(row.status_key) }))
    return selectedBadges.length > 0
      ? enriched.filter((row) => selectedBadges.includes(row.status_key ?? ""))
      : enriched
  }, [siteData, badgeByKey, selectedBadges])

  const includeStage = activeTab !== "deployed"
  const allowedStatusKeys = PROJECT_STATUS_FILTERS[projectKey] ?? []
  const badgeFilters: FilterBarConfig[] = badges.length
    ? [{
        key: "status_badges",
        label: "",
        type: "badge",
        values: selectedBadges,
        options: badges
          .filter((badge) => [...allowedStatusKeys, ...(includeStage ? ["stage"] : [])].includes(badge.key))
          .map((badge) => ({ label: badge.label, value: badge.key, color: badge.color })),
      }]
    : []

  function handleFilterChange(key: string, value: string) {
    if (key === "status_badges") {
      setSelectedBadges((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])
    }
  }

  const canSubprojectRead = can("subproject", "read")
  const isGlobalScope = roles.some((r) => r.project_id === null)
  const showSiteAdd = can("site", "write") && (isGlobalScope || projectKeys.includes(projectKey))
  const showSubprojectAdd = can("subproject", "write") && Boolean(projectMeta?.supports_subprojects) && (isGlobalScope || projectKeys.includes(projectKey))
  const showAddButton = showSiteAdd || showSubprojectAdd
  const showModalTabs = showSiteAdd && showSubprojectAdd
  const subprojectTabs = (projectMeta?.subprojects ?? []).filter((s) => !s.bucket)

  function openAddHandler() {
    setAddModalTab(showSiteAdd ? "site" : "subproject")
    setOpenAddModal(true)
  }

  const filterArea = (
    <div className="space-y-3">
      {canSubprojectRead && subprojectTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "deployed" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("deployed")}>Deployed</Button>
          {subprojectTabs.map((sub) => (
            <Button key={sub.id} variant={activeTab === sub.id ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab(sub.id)}>
              {subprojectLabel(sub)}
            </Button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <FilterBar filters={badgeFilters} onFilterChange={handleFilterChange} />
        <div className="flex shrink-0 items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Circuit ID"
            className="rounded-full border border-jscolors-crimson/15 bg-white px-5 py-3 outline-none"
          />
          {showAddButton && (
            <Button type="button" className="shrink-0" onClick={openAddHandler}>Add Site</Button>
          )}
        </div>
      </div>
      {metaError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{metaError}</div>}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
    </div>
  )

  return (
    <>
      <ListPageLayout
        filters={filterArea}
        pagination={pagination}
        onPageChange={setPage}
      >
        {loading && !siteData ? (
          <div className="py-8 text-center text-sm text-jscolors-text/50">Loading sites...</div>
        ) : (
          <DataTable
            columns={columns.map((column) => (
              column.key === "cost" || column.key === "paid" || column.key === "balance"
                ? { ...column, render: (value: unknown) => <div className="text-right tabular-nums pr-4">{formatCurrency(value as number | string)}</div> }
                : column
            ))}
            rows={rows}
            rowHref={(row) => `/projects/${projectKey}/site/${row.id}`}
          />
        )}
      </ListPageLayout>

      <Modal
        isOpen={openAddModal}
        title={showModalTabs ? (addModalTab === "site" ? "Add Site" : "Add Subproject") : showSiteAdd ? "Add Site" : "Add Subproject"}
        onClose={() => { setOpenAddModal(false); setSubmitting(false) }}
        size="lg"
        submitLabel={addModalTab === "site" ? "Add Site" : "Add Subproject"}
        onSubmit={() => {
          if (addModalTab === "site") {
            addSiteSubmitRef.current?.()
            return
          }
          addSubprojectSubmitRef.current?.()
        }}
        isSubmitting={submitting}
      >
        <>
          {showModalTabs && (
            <div className="mb-5 flex gap-2">
              <Button variant={addModalTab === "site" ? "primary" : "secondary"} size="sm" onClick={() => setAddModalTab("site")}>Add Site</Button>
              <Button variant={addModalTab === "subproject" ? "primary" : "secondary"} size="sm" onClick={() => setAddModalTab("subproject")}>Add Subproject</Button>
            </div>
          )}
          {(!showModalTabs || addModalTab === "site") && (
            <AddForm
              submitRef={addSiteSubmitRef}
              fields={formFields}
              states={states}
              onLoadingChange={setSubmitting}
              onSubmit={async (data) => {
                const subId = typeof activeTab === "number" ? activeTab : 1
                await api.post(`/sites/${projectKey}`, { project_key: projectKey, subproject_id: subId, data })
                setOpenAddModal(false)
              }}
            />
          )}
          {showModalTabs && addModalTab === "subproject" && (
            <BulkTable
              submitRef={addSubprojectSubmitRef}
              columns={bulkFields}
              onLoadingChange={setSubmitting}
              onSubmit={async ({ batchDate, rows: bulkRows }) => {
                await api.post("/projects/subprojects", { project_key: projectKey, batch_date: batchDate, rows: bulkRows })
                setOpenAddModal(false)
                refetch()
              }}
            />
          )}
        </>
      </Modal>
    </>
  )
}

