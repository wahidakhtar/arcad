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
  const [badgeMap, setBadgeMap] = useState<any>({})

  useEffect(() => {

    api.get("/badge/map").then(res => {
      setBadgeMap(res.data || {})
    })

    if (type === "status") {
      api.get("/badge/status", {
        params: {
          project_id: site.project_id,
          project_id: site.project_id,
          current_status_id: site.status_badge_id,
        },
      }).then(res => setBadges(res.data))
    }

    if (type === "doc" && entityTypeId) {
      api.get("/badge/doc_state", {
        params: {
          entity_type_id: entityTypeId,
          project_id: site.project_id,
          site_id: site.id,
        },
      }).then(res => setBadges(res.data))
    }

  }, [site])

  const handleUpdate = async (badgeId: number | null) => {
    await api.put(`/mi/site/${site.id}`, {
      [field]: badgeId,
    })
    reload()
  }

  const currentValue = site[field]
  const currentBadge = badgeMap[currentValue] || {}

  return (
    <select
      value={currentValue ?? ""}
      onChange={e => {
        const value = e.target.value
        handleUpdate(value ? Number(value) : null)
      }}
      style={{
        background: currentBadge.color || "#fff",
        padding: "4px",
      }}
    >

      <option value={currentValue ?? ""}>
        {currentBadge.label || "Current"}
      </option>

      {badges.map(b => (
        <option key={b.id} value={b.id}>
          {b.description}
        </option>
      ))}

    </select>
  )
}
