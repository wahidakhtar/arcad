import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api } from "../../lib/api"

type ProjectData = {
  key: string
  label: string
  subprojects: Array<{ id: number; batch_date: string | null }>
}

export default function SubprojectsPage() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const [project, setProject] = useState<ProjectData | null>(null)

  useEffect(() => {
    void api.get<ProjectData[]>("/projects").then((r) => {
      const match = r.data.find((p) => p.key === projectKey)
      setProject(match ?? null)
    })
  }, [projectKey])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">{project?.label ?? projectKey?.toUpperCase()}</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Subprojects</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(project?.subprojects ?? []).length === 0 && (
          <p className="text-sm text-jscolors-text/60">No subprojects available.</p>
        )}
        {(project?.subprojects ?? []).map((sub) => (
          <Link
            key={sub.id}
            to={`/projects/${projectKey}/sub/${sub.id}`}
            className="glass-panel block p-6 transition hover:shadow-glow"
          >
            <p className="font-syne text-xl font-semibold text-jscolors-crimson">
              {sub.batch_date
                ? new Date(sub.batch_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : `Batch ${sub.id}`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
