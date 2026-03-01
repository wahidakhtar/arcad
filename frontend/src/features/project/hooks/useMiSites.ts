import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useMiSites(projectCode: string | undefined) {
  const [siteList, setSiteList] = useState<any[]>([])
  const [capabilities, setCapabilities] = useState<any>({})

  const loadData = () => {
    if (!projectCode) return

    api.get(`/${projectCode}/1`)
      .then((res) => {
        setSiteList(res.data.data)
        setCapabilities(res.data.capabilities)
      })
  }

  useEffect(() => {
    loadData()
  }, [projectCode])

  return { siteList, capabilities, reload: loadData }
}
