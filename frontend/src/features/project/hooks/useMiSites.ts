import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export function useMiSites(projectCode: string | undefined) {

  const [siteList,setSiteList] = useState<any[]>([])
  const [fieldPermissions,setFieldPermissions] = useState<any>({})
  const [columns,setColumns] = useState<any[]>([])

  const loadData = async () => {

    if(!projectCode) return

    const res = await api.get(`/project/${projectCode}/sites`)

    setSiteList(res.data.data || [])
    setFieldPermissions(res.data.field_permissions || {})
    setColumns(res.data.columns || [])
  }

  useEffect(()=>{

    setSiteList([])
    setFieldPermissions({})
    setColumns([])

    loadData()

  },[projectCode])

  return { siteList, fieldPermissions, columns, reload: loadData }
}
