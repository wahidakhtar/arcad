import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useStatusBadges(
  project_id: number | undefined,
  current_status_id: number | undefined
) {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    if (!project_id || !current_status_id) return

    api
      .get("/v1/badge/status", {
        params: {
          project_id,
          current_status_id,
        },
      })
      .then((res) => setBadges(res.data))
  }, [project_id, current_status_id])

  return badges
}
