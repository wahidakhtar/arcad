import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useMiSites(projectCode: string | undefined) {

  const [siteList, setSiteList] = useState<any[]>([])
  const [fieldPermissions, setFieldPermissions] = useState<any>({})
  const [columns, setColumns] = useState<any[]>([])
  const [canAddSite, setCanAddSite] = useState(false)

  const loadData = async () => {

    if (!projectCode) return

    try {

      const res = await api.get(`/project/${projectCode}/sites`)

      const data = res.data || {}

      setSiteList(data.data || [])
      setFieldPermissions(data.field_permissions || {})
      setColumns(data.columns || [])
      setCanAddSite(data.can_add_site || false)

    } catch (err) {

      console.error("Failed to load sites:", err)

      setSiteList([])
      setFieldPermissions({})
      setColumns([])
      setCanAddSite(false)

    }
  }

  useEffect(() => {

    loadData()

  }, [projectCode])

  return {
    siteList,
    fieldPermissions,
    columns,
    canAddSite,
    reload: loadData
  }
}