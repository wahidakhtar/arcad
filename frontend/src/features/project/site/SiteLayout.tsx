import { Outlet, useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function SiteLayout(){

  const { projectCode, siteId } = useParams()
  const navigate = useNavigate()

  const [site,setSite] = useState<any>(null)
  const [permissions,setPermissions] = useState<any>({})
  const [columns,setColumns] = useState<any[]>([])
  const [badgeMap,setBadgeMap] = useState<any>({})
  const [transitions,setTransitions] = useState<any>({})
  const [error,setError] = useState<string | null>(null)

  const load = async () => {

    if(!projectCode || !siteId) return

    try{

      const siteRes = await api.get(`/project/${projectCode}/site/${siteId}`)
      const tableRes = await api.get(`/project/${projectCode}/sites`)

      const siteData = siteRes.data?.data ?? siteRes.data

      if(!siteData){
        setError("Site not returned from API")
        return
      }

      setSite(siteData)
      setPermissions(tableRes.data?.field_permissions || {})
      setColumns(tableRes.data?.columns || [])
      setBadgeMap(tableRes.data?.badges || {})
      setTransitions(tableRes.data?.transitions || {})

    }catch(err:any){

      console.error("Site load failed:", err)

      if(err.response?.status===403){
        navigate(`/${projectCode}`)
      }else{
        setError("Failed to load site")
      }

    }
  }

  useEffect(()=>{
    load()
  },[projectCode,siteId])

  if(error){
    return <div style={{padding:20}}>Error: {error}</div>
  }

  if(!site){
    return <div style={{padding:20}}>Loading site...</div>
  }

  return (
    <div>

      <div style={{display:"flex",gap:20,padding:10,borderBottom:"1px solid #ccc"}}>
        <button onClick={()=>navigate(`/${projectCode}/site/${siteId}/details`)}>
          Details
        </button>

        <button onClick={()=>navigate(`/${projectCode}/site/${siteId}/fe`)}>
          FE + Finance
        </button>
      </div>

      <Outlet
        context={{
          site,
          reload: load,
          permissions,
          columns,
          badgeMap,
          transitions,
          projectCode
        }}
      />

    </div>
  )
}