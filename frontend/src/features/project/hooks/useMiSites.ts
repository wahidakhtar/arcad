import { useEffect, useState, useCallback } from "react"
import { api } from "../../../lib/api"

export function useMiSites(projectCode: string | undefined) {

  const [siteList, setSiteList] = useState<any[]>([])
  const [fieldPermissions, setFieldPermissions] = useState<any>({})
  const [columns, setColumns] = useState<any[]>([])
  const [canAddSite, setCanAddSite] = useState(false)

  const loadData = useCallback(async () => {

    if (!projectCode) return

    try {

      const res = await api.get(`/project/${projectCode}/sites`)
      const data = res?.data || {}

      setSiteList(Array.isArray(data.data) ? data.data : [])
      setFieldPermissions(data.field_permissions || {})
      setColumns(Array.isArray(data.columns) ? data.columns : [])
      setCanAddSite(Boolean(data.can_add_site))

    } catch (err) {

      console.error("Failed to load sites:", err)

      setSiteList([])
      setFieldPermissions({})
      setColumns([])
      setCanAddSite(false)

    }

  }, [projectCode])

  useEffect(() => {

    loadData()

  }, [loadData])

  return {
    siteList,
    fieldPermissions,
    columns,
    canAddSite,
    reload: loadData
  }
}