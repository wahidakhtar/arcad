import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useParams } from "react-router-dom"

export default function BadgeCell({
  site,
  field,
  entityTypeId,
  reload
}: any){

  const { projectCode } = useParams()

  const [badgeMap,setBadgeMap] = useState<any>({})
  const [options,setOptions] = useState<any[]>([])

  const currentBadgeId = site[field]

  useEffect(()=>{
    api.get("/badge/map").then(res=>{
      setBadgeMap(res.data||{})
    })
  },[])

  useEffect(()=>{
    if(!projectCode || !currentBadgeId) return

    api.get("/badge/transitions",{
      params:{
        entity_type_id: entityTypeId,
        project_id: site.project_id,
        current_badge_id: currentBadgeId
      }
    }).then(res=>{
      setOptions(res.data||[])
    })

  },[currentBadgeId,entityTypeId,site.project_id,projectCode])

  const badge = badgeMap[currentBadgeId]

  const update = async(v:number)=>{
    await api.put(`/${projectCode}/site/${site.id}`,{
      [field]:v
    })
    reload()
  }

  if(!badge){
    return "-"
  }

  return(
    <select
      value={currentBadgeId||""}
      style={{backgroundColor:badge.color,color:"#000"}}
      onChange={e=>update(Number(e.target.value))}
    >
      <option value={currentBadgeId}>
        {badge.description || badge.name || badge.label}
      </option>

      {options
        .filter((o:any)=>o.id!==currentBadgeId)
        .map((o:any)=>(
          <option key={o.id} value={o.id}>
            {o.description || o.name || o.label}
          </option>
      ))}
    </select>
  )
}
