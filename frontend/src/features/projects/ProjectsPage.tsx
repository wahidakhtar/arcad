import { useEffect, useState } from "react"

import { api } from "../../lib/api"

type ProjectRow = {
  id: number
  key: string
  label: string
  active: boolean
  recurring: boolean
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])

  useEffect(() => {
    void api.get("/projects").then((response) => setProjects(response.data))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Projects</p>
          <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">All projects including inactive metadata modules</h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-jscolors-text/60">Recurring modules feed the sidebar; one-off modules remain metadata-only but still participate in admin and billing/transaction scope.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div key={project.id} className="glass-panel p-6">
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
        ))}
      </div>
    </div>
  )
}
