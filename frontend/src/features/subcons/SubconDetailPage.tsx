import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type SubconDetail = {
  id: number
  name: string
  subcon_type_label: string
  is_active: boolean
  created_at: string
  projects: Array<{ id: number; key: string; label: string }>
}

type ProjectRow = { id: number; key: string; label: string; active: boolean }

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45"

export default function SubconDetailPage() {
  const { subconId } = useParams()
  const { can } = useAuth()
  const canWrite = can("subproject", "write")

  const [subcon, setSubcon] = useState<SubconDetail | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState("")
  const [error, setError] = useState("")

  async function load() {
    if (!subconId) return
    setError("")
    try {
      const [subconResponse, projectsResponse] = await Promise.all([
        api.get(`/subcons/${subconId}`),
        api.get("/projects"),
      ])
      setSubcon(subconResponse.data as SubconDetail)
      setProjects((projectsResponse.data as ProjectRow[]).filter((p) => p.active))
    } catch {
      setError("Unable to load subcon details.")
    }
  }

  useEffect(() => {
    void load()
  }, [subconId])

  async function assignProject() {
    if (!subconId || !selectedProject) return
    setAssigning(true)
    setAssignError("")
    try {
      await api.post(`/subcons/${subconId}/projects`, { project_id: Number(selectedProject) })
      setSelectedProject("")
      await load()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setAssignError(detail ?? "Failed to assign project.")
    } finally {
      setAssigning(false)
    }
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!subcon) return <div className="p-6 text-jscolors-text/50">Loading...</div>

  const assignedIds = new Set(subcon.projects.map((p) => p.id))
  const availableProjects = projects.filter((p) => !assignedIds.has(p.id))

  return (
    <DetailPageLayout backHref="/subcons">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Identity</p>
          <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{subcon.name}</h1>
          <div className="mt-6 space-y-3">
            {[
              { label: "Type", value: subcon.subcon_type_label },
              { label: "Status", value: subcon.is_active ? "Active" : "Inactive" },
              { label: "Created", value: new Date(subcon.created_at).toLocaleDateString("en-IN") },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[18px] border border-jscolors-crimson/10 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{label}</div>
                <div className="mt-1 text-sm text-jscolors-text">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Assigned Projects</p>
          <div className="mt-5 space-y-3">
            {subcon.projects.length ? subcon.projects.map((project) => (
              <div key={project.id} className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-3 text-sm text-jscolors-text">
                {project.label}
              </div>
            )) : (
              <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-3 text-sm text-jscolors-text/60">
                No projects assigned
              </div>
            )}
          </div>

          {canWrite && availableProjects.length > 0 && (
            <div className="mt-6">
              <label className={labelCls}>Assign Project</label>
              <div className="flex gap-3">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Select Project</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.label}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  disabled={assigning || !selectedProject}
                  onClick={() => void assignProject()}
                >
                  {assigning ? "Assigning..." : "Assign"}
                </Button>
              </div>
              {assignError ? <p className="mt-2 text-sm text-red-600">{assignError}</p> : null}
            </div>
          )}
        </section>
      </div>
    </DetailPageLayout>
  )
}
