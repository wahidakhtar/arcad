import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import AddForm from "../../components/ui/AddForm"
import BulkTable from "../../components/ui/BulkTable"
import FilterBar, { type FilterBarConfig } from "../../components/ui/FilterBar"
import { getProjectConfig } from "../../config"
import { useListPage } from "../../hooks/useListPage"
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

export default function SiteListPage() {
  const { projectKey = "mi", subprojectId } = useParams()
  const config = useMemo(() => getProjectConfig(projectKey), [projectKey])
  const [columns, setColumns] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [bulkFields, setBulkFields] = useState<Array<{ key: string; label: string; type?: string }>>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [openAdd, setOpenAdd] = useState(false)
  const [openSubprojectAdd, setOpenSubprojectAdd] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])
  const [states, setStates] = useState<Array<{ id: number; label: string }>>([])
  const { data: siteData, loading, error, refetch } = useListPage<SiteRow[]>({
    endpoint: `/sites/${projectKey}`,
  })

  useEffect(() => {
    if (!config) {
      setColumns([])
      setFormFields([])
      setBulkFields([])
      return
    }

    void Promise.all([
      api.get("/badges", { params: { type: "status" } }),
      api.get(`/projects/${projectKey}/ui-fields`),
      api.get("/indian-states"),
    ]).then(([badgesResponse, uiFieldsResponse, statesResponse]) => {
        const statusBadges = badgesResponse.data as Badge[]
        const uiFields = (uiFieldsResponse.data as Array<{ key?: string; tag?: string; label: string; type?: string; list_view?: boolean; listView?: boolean }>).map((field) => ({
          key: field.key ?? field.tag ?? "",
          label: field.label,
          type: field.type,
          list_view: field.list_view ?? field.listView ?? false,
        }))
        console.log("ui-fields response", projectKey, uiFields)
        setBadges(statusBadges)
        setStates(statesResponse.data)
        const listColumns = uiFields
          .filter((field) => field.list_view)
          .map((field) => ({
            key: field.key === "status_key" ? "status_badge" : field.key,
            label: field.label,
            type: field.type,
          }))
        setColumns(listColumns.length ? listColumns : config.listColumns)
        setFormFields(uiFields.filter((field) => config.formFields.includes(field.key)))
        setBulkFields(uiFields.filter((field) => config.bulkColumns.includes(field.key)))
      },
    )
  }, [projectKey])

  if (!config) {
    return <div className="glass-panel p-6">Project config not available.</div>
  }

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
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">{config.label}</p>
          {subprojectId ? <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{`Subproject ${subprojectId}`}</h1> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Circuit ID"
            className="rounded-full border border-jscolors-crimson/15 bg-white px-5 py-3 outline-none"
          />
          <button type="button" className="premium-button-secondary" onClick={() => setOpenAdd(true)}>
            Add Site
          </button>
          {config.supportsSubprojects ? (
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

      <Modal open={openAdd} title={`Add ${config.label} Site`} onClose={() => setOpenAdd(false)}>
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
      <Modal open={openSubprojectAdd} title={`Add ${config.label} Subproject`} onClose={() => setOpenSubprojectAdd(false)}>
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
