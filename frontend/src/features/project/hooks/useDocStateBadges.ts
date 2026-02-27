import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useDocStateBadges() {
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    api.get("/v1/badge/doc_state").then(res => {
      setBadges(res.data)
    })
  }, [])

  return badges
}
