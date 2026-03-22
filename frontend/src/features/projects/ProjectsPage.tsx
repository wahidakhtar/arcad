import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type ProjectRow = {
  id: number
  key: string
  label: string
  active: boolean
  recurring: boolean
  supports_subprojects: boolean
}

export default function ProjectsPage() {
  const { can } = useAuth()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ label: "", key: "" })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  function loadProjects() {
    void api.get<ProjectRow[]>("/projects").then((r) => setProjects(r.data))
  }

  useEffect(() => {
    loadProjects()
  }, [])

  async function handleAddProject() {
    if (!form.label.trim() || !form.key.trim()) return
    setSaving(true)
    setSaveError("")
    try {
      await api.post("/projects", { key: form.key.trim().toLowerCase(), label: form.label.trim() })
      setAddOpen(false)
      setForm({ label: "", key: "" })
      loadProjects()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(detail ?? "Failed to create project.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {can("project", "write") && (
        <div className="flex justify-end">
          <button type="button" className="premium-button shrink-0" onClick={() => setAddOpen(true)}>
            Add Project
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const href = project.recurring
            ? project.supports_subprojects
              ? `/projects/${project.key}/subprojects`
              : `/projects/${project.key}`
            : null
          const card = (
            <div className="glass-panel p-6 transition hover:shadow-glow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-jscolors-text/42">{project.key}</p>
                  <h2 className="mt-2 font-syne text-2xl font-semibold text-jscolors-crimson">{project.label}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${project.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                  {project.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-6 text-sm text-jscolors-text/60">{project.recurring ? "Recurring operational schema enabled" : "Metadata-only one-off project"}</div>
            </div>
          )
          return href ? (
            <Link key={project.id} to={href}>{card}</Link>
          ) : (
            <div key={project.id}>{card}</div>
          )
        })}
      </div>

      {addOpen && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setAddOpen(false); setSaveError("") } }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-md p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Add Project</h2>
              <button type="button" onClick={() => { setAddOpen(false); setSaveError("") }} className="premium-button-secondary">Close</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Project Name</span>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="e.g. Maharashtra Circle"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Project Key (short code)</span>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="e.g. mh"
                />
              </label>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <button
                type="button"
                className="premium-button w-full"
                disabled={saving || !form.label.trim() || !form.key.trim()}
                onClick={() => void handleAddProject()}
              >
                {saving ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
