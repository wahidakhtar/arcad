import { useDeferredValue, useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import AddForm from "../../components/ui/AddForm"
import BulkTable from "../../components/ui/BulkTable"
import FilterBar, { type FilterBarConfig } from "../../components/ui/FilterBar"
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
  const [columns, setColumns] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [bulkFields, setBulkFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeTab, setActiveTab] = useState<"deployed" | number>("deployed")
  const [openAddModal, setOpenAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<"site" | "subproject">("site")
  const [badges, setBadges] = useState<Badge[]>([])
  const [states, setStates] = useState<Array<{ id: number; label: string }>>([])

  const siteEndpoint =
    activeTab === "deployed"
      ? `/sites/${projectKey}?exclude_staged=true`
      : `/sites/${projectKey}?subproject_id=${activeTab}`

  const { data: siteData, loading, error, refetch } = useListPage<SiteRow[]>({
    endpoint: siteEndpoint,
  })

  useEffect(() => {
    setActiveTab("deployed")
    void Promise.all([
      api.get("/badges", { params: { type: "status" } }),
      api.get(`/projects/${projectKey}/ui-fields`),
      api.get("/indian-states"),
      api.get("/projects"),
    ]).then(([badgesResponse, uiFieldsResponse, statesResponse, projectsResponse]) => {
      const statusBadges = badgesResponse.data as Badge[]
      const uiFields = uiFieldsResponse.data as UIField[]
      const projects = projectsResponse.data as Array<{
        key: string
        label: string
        supports_subprojects: boolean
        subprojects: Subproject[]
      }>
      const project = projects.find((p) => p.key === projectKey)

      setBadges(statusBadges)
      setStates(statesResponse.data)
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
        }))
      setColumns(listColumns)
      setFormFields(uiFields.filter((f) => f.form_view).map(({ key, label, type }) => ({ key, label, type })))
      setBulkFields(uiFields.filter((f) => f.bulk_view).map(({ key, label, type }) => ({ key, label, type })))
    })
  }, [projectKey])

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  const badgeByKey = new Map(badges.map((badge) => [badge.key, badge]))
  const rows = (siteData ?? []).map((row) => ({
    ...row,
    status_badge: badgeByKey.get(row.status_key),
  }))
  const filtered = rows.filter((row) => row.ckt_id.toLowerCase().includes(deferredSearch.toLowerCase()))

  const includeStage = activeTab !== "deployed"
  const badgeFilters: FilterBarConfig[] = badges.length
    ? [
        {
          key: "status_badges",
          label: "Filter by Status",
          type: "badge",
          options: badges
            .filter((badge) =>
              ["p_wait", "wip", "rect", "down", "comp", ...(includeStage ? ["stage"] : [])].includes(badge.key),
            )
            .map((badge) => ({ label: badge.label, value: badge.key, color: badge.color })),
        },
      ]
    : []

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canSubprojectRead && subprojectTabs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <TabPill active={activeTab === "deployed"} onClick={() => setActiveTab("deployed")}>
              Deployed
            </TabPill>
            {subprojectTabs.map((sub) => (
              <TabPill key={sub.id} active={activeTab === sub.id} onClick={() => setActiveTab(sub.id)}>
                {subprojectLabel(sub)}
              </TabPill>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Circuit ID"
            className="rounded-full border border-jscolors-crimson/15 bg-white px-5 py-3 outline-none"
          />
          {showAddButton && (
            <button type="button" className="premium-button-secondary" onClick={openAddHandler}>
              + Add
            </button>
          )}
        </div>
      </div>

      <FilterBar filters={badgeFilters} onFilterChange={() => {}} />

      <div className="overflow-x-auto">
        {loading && !siteData ? (
          <div className="py-8 text-center text-sm text-jscolors-text/50">Loading sites...</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowHref={(row) => `/projects/${projectKey}/site/${row.id}`}
          />
        )}
      </div>

      <Modal open={openAddModal} title="Add" onClose={() => setOpenAddModal(false)}>
        {showModalTabs && (
          <div className="mb-5 flex gap-2">
            <TabPill active={addModalTab === "site"} onClick={() => setAddModalTab("site")}>
              Add Site
            </TabPill>
            <TabPill active={addModalTab === "subproject"} onClick={() => setAddModalTab("subproject")}>
              Add Subproject
            </TabPill>
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
      </Modal>
    </div>
  )
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
        active
          ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
          : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40 hover:bg-white/90"
      }`}
    >
      {children}
    </button>
  )
}
