import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { api } from "../../lib/api"

type ProjectRow = { id: number; key: string; label: string }

export default function OneOffProjectPage() {
  const { projectKey = "" } = useParams()
  const [label, setLabel] = useState("")

  useEffect(() => {
    void api.get<ProjectRow[]>("/projects").then((r) => {
      const project = r.data.find((p) => p.key === projectKey)
      if (project) setLabel(project.label)
    })
  }, [projectKey])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-jscolors-text/40">{projectKey}</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{label || projectKey}</h1>
      </div>
      <div className="glass-panel p-8 text-center text-jscolors-text/50">
        This project page is under construction.
      </div>
    </div>
  )
}
