import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useDocStateBadges(
  entityTypeId: number,
  projectId: number,
  siteId: number
) {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    if (!entityTypeId || !projectId || !siteId) return

    api
      .get("/badge/doc_state", {
        params: {
          entity_type_id: entityTypeId,
          project_id: projectId,
          site_id: siteId,
        },
      })
      .then(res => setBadges(res.data))
  }, [entityTypeId, projectId, siteId])

  return badges
}
