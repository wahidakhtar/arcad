import { useEffect, useState, useMemo } from "react"
import { api } from "../../../lib/api"

interface Props {
  site: any
  field: "po_status_badge_id" | "invoice_status_badge_id" | "wcc_badge_id"
  entityTypeId: number
  reload: () => void
}

export default function DocBadgeSelectCell({
  site,
  field,
  entityTypeId,
  reload,
}: Props) {

  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    api.get("/badge/doc_state", {
      params: {
        entity_type_id: entityTypeId,
        project_id: site.project_id,
        site_id: site.id,
      },
    }).then(res => setBadges(res.data))
  }, [site.id, site.project_id, entityTypeId])

  const currentValue: number | null = site[field] ?? null

  const selectedBadge = useMemo(
    () => badges.find(b => b.id === currentValue),
    [badges, currentValue]
  )

  const handleUpdate = async (badgeId: number) => {
    await api.put(`/mi/site/${site.id}`, {
      [field]: badgeId,
    })
    reload()
  }

  // If WCC or Invoice and completion_date not present → render empty cell
  if (
    (field === "wcc_badge_id" || field === "invoice_status_badge_id") &&
    !site.completion_date
  ) {
    return <span />
  }

  return (
    <select
      value={currentValue ?? ""}
      onChange={e => handleUpdate(Number(e.target.value))}
      style={{
        background: selectedBadge?.color || "#fff",
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
