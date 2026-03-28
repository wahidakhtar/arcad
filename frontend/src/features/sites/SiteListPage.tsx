import { useCallback, useEffect, useMemo, useState } from "react"
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

type Subproject = { id: number; batch_date: string | null; bucket?: boolean }

type ProjectMeta = {
  label: string
  supports_subprojects: boolean
  subprojects: Subproject[]
}

function subprojectLabel(sub: Subproject) {
  return sub.batch_date
    ? new Date(sub.batch_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `Batch ${sub.id}`
}

export default function SiteListPage() {
  const { can } = useAuth()
  const { projectKey = "mi" } = useParams()
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [columns, setColumns] = useState<Array<{ key: string; label: string; type?: string; minWidth?: number }>>([])
  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [bulkFields, setBulkFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"deployed" | number>("deployed")
  const [selectedBadges, setSelectedBadges] = useState<string[]>([])
  const [openAddModal, setOpenAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<"site" | "subproject">("site")
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
      const listColumns = uiFields
        .filter((field) => field.list_view)
        .map((field) => ({
          key: field.key === "status" ? "status_badge" : field.key,
          label: field.label,
          type: field.type,
          minWidth: field.key === "ckt_id" ? 120 : field.key === "status" ? 140 : field.type === "date" ? 110 : 100,
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
  const badgeFilters: FilterBarConfig[] = badges.length
    ? [{
        key: "status_badges",
        label: "",
        type: "badge",
        values: selectedBadges,
        options: badges
          .filter((badge) => ["p_wait", "wip", "rect", "down", "comp", ...(includeStage ? ["stage"] : [])].includes(badge.key))
          .map((badge) => ({ label: badge.label, value: badge.key, color: badge.color })),
      }]
    : []

  function handleFilterChange(key: string, value: string) {
    if (key === "status_badges") {
      setSelectedBadges((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])
    }
  }

  const canSubprojectRead = can("subproject", "read")
  const showSiteAdd = can("site", "write")
  const showSubprojectAdd = can("subproject", "write") && Boolean(projectMeta?.supports_subprojects)
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
          <TabPill active={activeTab === "deployed"} onClick={() => setActiveTab("deployed")}>Deployed</TabPill>
          {subprojectTabs.map((sub) => (
            <TabPill key={sub.id} active={activeTab === sub.id} onClick={() => setActiveTab(sub.id)}>
              {subprojectLabel(sub)}
            </TabPill>
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
            <Button type="button" className="shrink-0" onClick={openAddHandler}>Add</Button>
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
            columns={columns}
            rows={rows}
            rowHref={(row) => `/projects/${projectKey}/site/${row.id}`}
          />
        )}
      </ListPageLayout>

      <Modal
        open={openAddModal}
        title={showModalTabs ? (addModalTab === "site" ? "Add Site" : "Add Subproject") : showSiteAdd ? "Add Site" : "Add Subproject"}
        onClose={() => setOpenAddModal(false)}
        size="lg"
      >
        <>
          {showModalTabs && (
            <div className="mb-5 flex gap-2">
              <TabPill active={addModalTab === "site"} onClick={() => setAddModalTab("site")}>Add Site</TabPill>
              <TabPill active={addModalTab === "subproject"} onClick={() => setAddModalTab("subproject")}>Add Subproject</TabPill>
            </div>
          )}
          {(!showModalTabs || addModalTab === "site") && (
            <AddForm
              fields={formFields}
              states={states}
              onSubmit={async (data) => {
                const subId = typeof activeTab === "number" ? activeTab : 1
                await api.post(`/sites/${projectKey}`, { project_key: projectKey, subproject_id: subId, data })
                setOpenAddModal(false)
                refetch()
              }}
            />
          )}
          {showModalTabs && addModalTab === "subproject" && (
            <BulkTable
              columns={bulkFields}
              states={states}
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

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="secondary"
      className={`px-5 py-2 ${
        active
          ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
          : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40 hover:bg-white/90"
      }`}
    >
      {children}
    </Button>
  )
}
