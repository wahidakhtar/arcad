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

type ProjectMeta = {
  label: string
  supports_subprojects: boolean
  subprojects: Array<{ id: number; batch_date: string | null; bucket?: boolean }>
}

export default function SiteListPage() {
  const { can } = useAuth()
  const { projectKey = "mi", subprojectId } = useParams()
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [columns, setColumns] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [bulkFields, setBulkFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [openAdd, setOpenAdd] = useState(false)
  const [openSubprojectAdd, setOpenSubprojectAdd] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])
  const [states, setStates] = useState<Array<{ id: number; label: string }>>([])
  const siteEndpoint = subprojectId
    ? `/sites/${projectKey}?subproject_id=${subprojectId}`
    : `/sites/${projectKey}?exclude_staged=true`
  const { data: siteData, loading, error, refetch } = useListPage<SiteRow[]>({
    endpoint: siteEndpoint,
  })

  useEffect(() => {
    void Promise.all([
      api.get("/badges", { params: { type: "status" } }),
      api.get(`/projects/${projectKey}/ui-fields`),
      api.get("/indian-states"),
      api.get("/projects"),
    ]).then(([badgesResponse, uiFieldsResponse, statesResponse, projectsResponse]) => {
      const statusBadges = badgesResponse.data as Badge[]
      const uiFields = uiFieldsResponse.data as UIField[]
      const projects = projectsResponse.data as Array<{ key: string; label: string; supports_subprojects: boolean; subprojects: Array<{ id: number; batch_date: string | null }> }>
      const project = projects.find((p) => p.key === projectKey)

      setBadges(statusBadges)
      setStates(statesResponse.data)
      setProjectMeta(project ? { label: project.label, supports_subprojects: project.supports_subprojects, subprojects: project.subprojects ?? [] } : null)

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

  if (loading) {
    return <div className="glass-panel p-6">Loading sites...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  const badgeByKey = new Map(badges.map((badge) => [badge.key, badge]))
  const rows = (siteData ?? []).map((row) => ({
    ...row,
    status_badge: badgeByKey.get(row.status_key),
  }))
  const filtered = rows.filter((row) => row.ckt_id.toLowerCase().includes(deferredSearch.toLowerCase()))
  const badgeFilters: FilterBarConfig[] = badges.length
    ? [
        {
          key: "status_badges",
          label: "Filter by Status",
          type: "badge",
          options: badges
            .filter((badge) => ["p_wait", "wip", "rect", "down", "comp", subprojectId ? "stage" : ""].includes(badge.key))
            .map((badge) => ({ label: badge.label, value: badge.key, color: badge.color })),
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">{projectMeta?.label ?? projectKey.toUpperCase()}</p>
          {subprojectId ? (() => {
            const sub = projectMeta?.subprojects.find((s) => String(s.id) === subprojectId)
            const label = sub?.batch_date
              ? new Date(sub.batch_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : `Batch ${subprojectId}`
            return <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{label}</h1>
          })() : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Circuit ID"
            className="rounded-full border border-jscolors-crimson/15 bg-white px-5 py-3 outline-none"
          />
          {can("site", "write") && (
            <button type="button" className="premium-button-secondary" onClick={() => setOpenAdd(true)}>
              Add Site
            </button>
          )}
          {projectMeta?.supports_subprojects && can("subproject", "write") ? (
            <button type="button" className="premium-button-secondary" onClick={() => setOpenSubprojectAdd(true)}>
              Add Subproject
            </button>
          ) : null}
        </div>
      </div>

      <FilterBar filters={badgeFilters} onFilterChange={() => {}} />

      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          rows={filtered}
          rowHref={(row) => `/projects/${projectKey}/site/${row.id}`}
        />
      </div>

      <Modal open={openAdd} title={`Add ${projectMeta?.label ?? projectKey.toUpperCase()} Site`} onClose={() => setOpenAdd(false)}>
        <AddForm
          fields={formFields}
          states={states}
          onSubmit={async (data) => {
            await api.post(`/sites/${projectKey}`, { project_key: projectKey, subproject_id: Number(subprojectId ?? 1), data })
            setOpenAdd(false)
            refetch()
          }}
        />
      </Modal>
      <Modal open={openSubprojectAdd} title={`Add ${projectMeta?.label ?? projectKey.toUpperCase()} Subproject`} onClose={() => setOpenSubprojectAdd(false)}>
        <BulkTable
          columns={bulkFields}
          states={states}
          onSubmit={async ({ batchDate, rows }) => {
            await api.post("/projects/subprojects", { project_key: projectKey, batch_date: batchDate, rows })
            setOpenSubprojectAdd(false)
            refetch()
          }}
        />
      </Modal>
    </div>
  )
}
