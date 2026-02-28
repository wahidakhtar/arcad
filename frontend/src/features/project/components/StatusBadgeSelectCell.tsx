import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Props {
  site: any
  reload: () => void
}

export default function StatusBadgeSelectCell({ site, reload }: Props) {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    api.get("/badge/status", {
      params: {
        project_id: site.project_id,
        current_status_id: site.status_badge_id,
      },
    }).then(res => setBadges(res.data))
  }, [site.id, site.project_id, site.status_badge_id])

  const handleUpdate = async (badgeId: number) => {
    await api.put(`/mi/site/${site.id}`, {
      status_badge_id: badgeId,
    })
    reload()
  }

  return (
    <select
      value={site.status_badge_id}
      onChange={e => handleUpdate(Number(e.target.value))}
      style={{
        background: site.status_color,
        padding: "4px",
      }}
    >
      <option value={site.status_badge_id}>
        {site.status_label}
      </option>

      {badges.map(b => (
        <option key={b.id} value={b.id}>
          {b.description}
        </option>
      ))}
    </select>
  )
}
