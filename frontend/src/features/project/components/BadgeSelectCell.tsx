import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Props {
  site: any
  field: string
  type: "status" | "doc"
  entityTypeId?: number
  reload: () => void
}

export default function BadgeSelectCell({
  site,
  field,
  type,
  entityTypeId,
  reload,
}: Props) {

  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    if (type === "status") {
      api.get("/api/v1/badge/status", {
        params: {
          project_id: site.project_id,
          current_status_id: site.status_badge_id,
        },
      }).then(res => setBadges(res.data))
    }

    if (type === "doc" && entityTypeId) {
      api.get("/api/v1/badge/doc_state", {
        params: {
          entity_type_id: entityTypeId,
          project_id: site.project_id,
        },
      }).then(res => setBadges(res.data))
    }

  }, [site.project_id, site.status_badge_id, type, entityTypeId])

  const handleUpdate = async (badgeId: number) => {
    await api.put(`/api/v1/mi/site/${site.id}`, {
      [field]: badgeId,
    })
    reload()
  }

  const currentValue = site[field] || ""
  const selected = badges.find(b => b.id === currentValue)

  return (
    <select
      value={currentValue}
      onChange={e => handleUpdate(Number(e.target.value))}
      style={{
        background:
          type === "status"
            ? site.status_color || "#ccc"
            : selected?.color || "#fff",
        padding: "4px",
      }}
    >
      {type === "status" && (
        <option value={site.status_badge_id}>
          {site.status_label}
        </option>
      )}

      {badges.map(b => (
        <option key={b.id} value={b.id}>
          {b.description}
        </option>
      ))}
    </select>
  )
}
