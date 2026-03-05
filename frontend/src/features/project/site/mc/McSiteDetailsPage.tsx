import { useOutletContext } from "react-router-dom"
import { useState } from "react"
import { api } from "../../../../lib/api"
import BadgeSelectCell from "../../components/BadgeSelectCell"

export default function McSiteDetailsPage() {
  const { site, reload } = useOutletContext<any>()
  const [form, setForm] = useState({ ...site })

  const handleSave = async () => {
    await api.put(`/site/${site.id}`, form)
    reload()
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>

        <BadgeSelectCell
          site={site}
          field="status_badge_id"
          type="status"
          reload={reload}
        />

        <BadgeSelectCell
          site={site}
          field="po_status_badge_id"
          type="doc"
          entityTypeId={4}
          reload={reload}
        />

        {site.completion_date && (
          <>
            <BadgeSelectCell
              site={site}
              field="wcc_badge_id"
              type="doc"
              entityTypeId={5}
              reload={reload}
            />

            <BadgeSelectCell
              site={site}
              field="billing_status_badge_id"
              type="doc"
              entityTypeId={6}
              reload={reload}
            />
          </>
        )}

      </div>

    </div>
  )
}
