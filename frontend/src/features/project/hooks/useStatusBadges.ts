import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useStatusBadges() {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    api.get("/v1/badge/status")
      .then(res => setBadges(res.data))
  }, [])

  return badges
}
