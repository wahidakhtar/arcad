import { useEffect, useState } from "react"
import { api } from "../../../lib/api"
import { useParams } from "react-router-dom"

interface Props {
  site: any
  field: string
  entityTypeId: number
  reload: () => void
  canToggle: boolean
}

export default function DocBadgeSelectCell({
  site,
  field,
  entityTypeId,
  reload,
  canToggle,
}: Props) {

  const { projectCode } = useParams()
  const [options, setOptions] = useState<any[]>([])

  const currentValue = site[field]

  useEffect(() => {
    if (!canToggle || !projectCode) return

    api.get("/badge/doc_state", {
      params: {
        entity_type_id: entityTypeId,
        project_id: 1,
        site_id: site.id,
      },
    }).then(res => setOptions(res.data))
  }, [site.id, entityTypeId, projectCode, canToggle])

  // ---- READ ONLY BADGE ----
  if (!canToggle) {
    return (
      <span
        style={{
          background: site[`${field.replace("_badge_id", "")}_color`] || "#ccc",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        {site[`${field.replace("_badge_id", "")}_label`] || ""}
      </span>
    )
  }

  // ---- EDITABLE DROPDOWN ----
  return (
    <select
      value={currentValue || ""}
      onChange={async (e) => {
        if (!projectCode) return

        await api.put(`/${projectCode}/site/${site.id}`, {
          [field]: Number(e.target.value),
        })

        reload()
      }}
    >
      <option value={currentValue}>
        {site[`${field.replace("_badge_id", "")}_label`] || ""}
      </option>

      {options.map(opt => (
        <option key={opt.id} value={opt.id}>
          {opt.badge_key}
        </option>
      ))}
    </select>
  )
}
