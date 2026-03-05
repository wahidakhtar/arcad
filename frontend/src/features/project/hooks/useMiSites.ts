import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useMiSites(projectCode: string | undefined) {

  const [siteList,setSiteList] = useState<any[]>([])
  const [fieldPermissions,setFieldPermissions] = useState<any>({})
  const [columns,setColumns] = useState<any[]>([])
  const [canAddSite,setCanAddSite] = useState(false)

  const loadData = async () => {

    if(!projectCode) return

    const res = await api.get(`/project/${projectCode}/sites`)

    setSiteList(res.data.data || [])
    setFieldPermissions(res.data.field_permissions || {})
    setColumns(res.data.columns || []);
    setCanAddSite(res.data.can_add_site || false)
    setCanAddSite(res.data.can_add_site || false)
  }

  useEffect(()=>{

    setSiteList([])
    setFieldPermissions({})
    setColumns([])
    setCanAddSite(false)

    loadData()

  },[projectCode])

  return { siteList, fieldPermissions, columns, canAddSite, reload: loadData }
}
