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
      api.get("/badge/status", {
        params: {
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

  }, [
    site.id,
    site.project_id,
    site.status_badge_id,
    type,
    entityTypeId,
  ])

  const handleUpdate = async (badgeId: number | null) => {
    await api.put(`/mi/site/${site.id}`, {
      [field]: badgeId,
    })
    reload()
  }

  let currentValue: number | null = null
  let currentColor: string = "#fff"

  if (type === "status") {
    currentValue = site.status_badge_id
    currentColor = site.status_color || "#ccc"
  } else {
    if (field === "po_status_badge_id") {
      currentValue = site.po_status_badge_id
      currentColor = site.po_status_color
    }

    if (field === "invoice_status_badge_id") {
      currentValue = site.invoice_status_badge_id
      currentColor = site.invoice_status_color
    }

    if (field === "wcc_badge_id") {
      currentValue = site.wcc_badge_id
      currentColor = site.wcc_status_color
    }
  }

  return (
    <select
      value={currentValue ?? ""}
      onChange={e => {
        const value = e.target.value
        handleUpdate(value ? Number(value) : null)
      }}
      style={{
        background: currentColor || "#fff",
        padding: "4px",
      }}
    >
      {badges.map(b => (
        <option key={b.id} value={b.id}>
          {b.description}
        </option>
      ))}
    </select>
  )
}
