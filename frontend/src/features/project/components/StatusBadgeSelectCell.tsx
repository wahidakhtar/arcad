import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

export default function StatusBadgeSelectCell({ site, reload }: any) {
  const { projectCode } = useParams()
  const { canOpenDetail } = useAuth()
  const [options, setOptions] = useState<any[]>([])

  const canToggle = projectCode ? canOpenDetail(projectCode) : false

  useEffect(() => {
    if (!canToggle || !projectCode) return

    api.get("/badge/status", {
      params: {
        project_id: 1,
        current_status_id: site.status_badge_id,
      },
    }).then(res => setOptions(res.data))
  }, [site.status_badge_id, projectCode, canToggle])

  // ---- READ-ONLY BADGE ----
  if (!canToggle) {
    return (
      <span
        style={{
          background: site.status_color || "#ccc",
          color: "black",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        {site.status_label}
      </span>
    )
  }

  // ---- EDITABLE ----
  return (
    <select
      value={site.status_badge_id}
      onChange={async (e) => {
        await api.put(`/${projectCode}/site/${site.id}`, {
          status_badge_id: Number(e.target.value),
        })
        reload()
      }}
    >
      <option value={site.status_badge_id}>
        {site.status_label}
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.badge_key}
        </option>
      ))}
    </select>
  )
}
