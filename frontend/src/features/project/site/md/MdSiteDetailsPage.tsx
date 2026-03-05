import { useEffect, useState } from "react"
import { api } from "../../../../lib/api"
import BadgeSelectCell from "../../components/BadgeSelectCell"

export default function MdSiteDetailsPage() {
  const [site,setSite] = useState<any>(null)

  const reload = ()=>{
    api.get("/site/current").then(res=>{
      setSite(res.data)
    })
  }

  useEffect(()=>{
    reload()
  },[])

  if(!site){
    return "Loading..."
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>

        <BadgeSelectCell
          site={site}
          field="status_badge_id"
          entityTypeId={2}
          reload={reload}
        />

        <BadgeSelectCell
          site={site}
          field="po_status_badge_id"
          entityTypeId={4}
          reload={reload}
        />

        {site.completion_date && (
          <>
            <BadgeSelectCell
              site={site}
              field="wcc_badge_id"
              entityTypeId={5}
              reload={reload}
            />

            <BadgeSelectCell
              site={site}
              field="billing_status_badge_id"
              entityTypeId={6}
              reload={reload}
            />
          </>
        )}

      </div>

    </div>
  )
}
