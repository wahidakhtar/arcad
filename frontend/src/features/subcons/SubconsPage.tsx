import { useEffect, useState } from "react"

import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type ProjectRow = {
  id: number
  key: string
  label: string
  active: boolean
}

type SubconProjectRow = {
  id: number
  key: string
  label: string
}

type SubconRow = {
  id: number
  name: string
  subcon_type_id: number
  subcon_type_key: string
  subcon_type_label: string
  is_active: boolean
  created_at: string
  projects: SubconProjectRow[]
}

const SUBCON_TYPE_OPTIONS = [
  { id: 1, label: "ISP" },
  { id: 2, label: "Field Engineer" },
]

export default function SubconsPage() {
  const { can } = useAuth()
  const [subcons, setSubcons] = useState<SubconRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [createForm, setCreateForm] = useState({ name: "", subcon_type_id: "1" })
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState("")
  const [assignBySubcon, setAssignBySubcon] = useState<Record<number, string>>({})
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [assignErrorBySubcon, setAssignErrorBySubcon] = useState<Record<number, string>>({})

  async function loadPage() {
    setLoading(true)
    setError("")
    try {
      const [subconsResponse, projectsResponse] = await Promise.all([
        api.get<SubconRow[]>("/subcons"),
        api.get<ProjectRow[]>("/projects"),
      ])
      setSubcons(subconsResponse.data)
      setProjects(projectsResponse.data.filter((project) => project.active))
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to load subcons.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
  }, [])

  async function createSubcon() {
    if (!createForm.name.trim()) return
    setCreateSaving(true)
    setCreateError("")
    try {
      await api.post("/subcons", {
        name: createForm.name.trim(),
        subcon_type_id: Number(createForm.subcon_type_id),
      })
      setCreateForm({ name: "", subcon_type_id: "1" })
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setCreateError(detail ?? "Failed to create subcon.")
    } finally {
      setCreateSaving(false)
    }
  }

  async function assignProject(subconId: number) {
    const projectId = assignBySubcon[subconId]
    if (!projectId) return
    setAssigningId(subconId)
    setAssignErrorBySubcon((current) => ({ ...current, [subconId]: "" }))
    try {
      await api.post(`/subcons/${subconId}/projects`, { project_id: Number(projectId) })
      setAssignBySubcon((current) => ({ ...current, [subconId]: "" }))
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setAssignErrorBySubcon((current) => ({ ...current, [subconId]: detail ?? "Failed to assign project." }))
    } finally {
      setAssigningId(null)
    }
  }

  if (!can("subproject", "write")) {
    return <div className="p-6 text-red-600">Subcon management requires `subproject:write`.</div>
  }

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading subcons...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Subcon Registry</p>
            <h1 className="mt-2 font-syne text-3xl font-semibold text-jscolors-crimson">Manage Subcons</h1>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.5fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Subcon Name</span>
            <input
              type="text"
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
              placeholder="Enter subcon name"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Type</span>
            <select
              value={createForm.subcon_type_id}
              onChange={(event) => setCreateForm((current) => ({ ...current, subcon_type_id: event.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            >
              {SUBCON_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="premium-button w-full"
              disabled={createSaving || !createForm.name.trim()}
              onClick={() => void createSubcon()}
            >
              {createSaving ? "Creating..." : "Create Subcon"}
            </button>
          </div>
        </div>
        {createError ? <p className="mt-4 text-sm text-red-600">{createError}</p> : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {subcons.map((subcon) => {
          const assignedProjectIds = new Set(subcon.projects.map((project) => project.id))
          const availableProjects = projects.filter((project) => !assignedProjectIds.has(project.id))
          return (
            <section key={subcon.id} className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{subcon.subcon_type_label}</p>
                  <h2 className="mt-2 font-syne text-2xl font-semibold text-jscolors-crimson">{subcon.name}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subcon.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                  {subcon.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Assigned Projects</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {subcon.projects.length ? subcon.projects.map((project) => (
                    <span key={project.id} className="rounded-full border border-jscolors-crimson/15 bg-white px-3 py-1 text-xs font-semibold text-jscolors-crimson">
                      {project.label}
                    </span>
                  )) : <span className="text-sm text-jscolors-text/55">No projects assigned yet.</span>}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Assign Project</span>
                  <select
                    value={assignBySubcon[subcon.id] ?? ""}
                    onChange={(event) => setAssignBySubcon((current) => ({ ...current, [subcon.id]: event.target.value }))}
                    className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Select Project</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.label}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="premium-button w-full"
                    disabled={assigningId === subcon.id || !assignBySubcon[subcon.id] || availableProjects.length === 0}
                    onClick={() => void assignProject(subcon.id)}
                  >
                    {assigningId === subcon.id ? "Assigning..." : "Assign Project"}
                  </button>
                </div>
              </div>
              {assignErrorBySubcon[subcon.id] ? <p className="mt-3 text-sm text-red-600">{assignErrorBySubcon[subcon.id]}</p> : null}
            </section>
          )
        })}
      </div>

      {subcons.length === 0 ? (
        <div className="glass-panel p-6 text-sm text-jscolors-text/60">No subcons created yet.</div>
      ) : null}
    </div>
  )
}
