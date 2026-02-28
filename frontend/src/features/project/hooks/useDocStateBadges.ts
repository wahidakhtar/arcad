import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useDocStateBadges(entityTypeId: number, projectId: number) {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    if (!entityTypeId || !projectId) return

    api
      .get("/api/v1/badge/doc_state", {
        params: {
          entity_type_id: entityTypeId,
          project_id: projectId,
        },
      })
      .then(res => setBadges(res.data))
  }, [entityTypeId, projectId])

  return badges
}
