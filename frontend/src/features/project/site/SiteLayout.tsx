import { Outlet, useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function SiteLayout(){

  const { projectCode, siteId } = useParams()
  const navigate = useNavigate()

  const [site,setSite] = useState<any>(null)
  const [permissions,setPermissions] = useState<any>({})
  const [columns,setColumns] = useState<any[]>([])

  const load = async () => {

    if(!projectCode || !siteId) return

    try{

      const siteRes = await api.get(`/${projectCode}/site/${siteId}`)
      const tableRes = await api.get(`/project/${projectCode}/sites`)

      setSite(siteRes.data.data)
      setPermissions(tableRes.data.field_permissions || {})
      setColumns(tableRes.data.columns || [])

    }catch(err:any){

      if(err.response?.status===403){
        navigate(`/${projectCode}`)
      }

    }
  }

  useEffect(()=>{
    load()
  },[projectCode,siteId])

  if(!site) return null

  return (
    <Outlet
      context={{
        site,
        reload: load,
        permissions,
        columns
      }}
    />
  )
}
