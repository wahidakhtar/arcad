import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useMiSites(project_id: string | undefined) {
  const [siteList, setSiteList] = useState<any[]>([])

  const loadData = () => {
    if (!project_id) return
    api.get(`/v1/mi/${project_id}`)
      .then((res) => setSiteList(res.data))
  }

  useEffect(() => {
    loadData()
  }, [project_id])

  return { siteList, reload: loadData }
}
