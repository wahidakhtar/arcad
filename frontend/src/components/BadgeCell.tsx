import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useParams } from "react-router-dom"

const COLUMN_ENTITY_MAP: Record<string, number> = {
  status_badge_id: 2,
  wcc: 5
}

export default function BadgeCell({
  site,
  field,
  reload
}: any){

  const { projectCode } = useParams()

  const [badgeMap, setBadgeMap] = useState<any>({})
  const [options, setOptions] = useState<number[]>([])

  const currentBadgeId = site[field]
  const entityTypeId = COLUMN_ENTITY_MAP[field]

  useEffect(()=>{
    api.get("/badge/map").then(res=>{
      setBadgeMap(res.data || {})
    })
  },[])

  useEffect(()=>{
    if(!currentBadgeId || !entityTypeId) return

    api.get("/badge/transitions",{
      params:{
        entity_type_id: entityTypeId,
        current_badge_id: currentBadgeId
      }
    }).then(res=>{
      const ids = (res.data || []).map((r:any)=>r.to_badge_id ?? r.id)
      setOptions(ids)
    })

  },[currentBadgeId, entityTypeId])

  const badge = badgeMap[currentBadgeId]

  const update = async(v:number)=>{
    await api.put(`/${projectCode}/site/${site.id}`,{
      [field]: v
    })
    reload()
  }

  if(!badge){
    return "-"
  }

  return(
    <select
      value={currentBadgeId || ""}
      style={{ backgroundColor: badge.color, color: "#000" }}
      onChange={e=>update(Number(e.target.value))}
    >
      <option value={currentBadgeId}>
        {badge.description || badge.name || badge.label}
      </option>

      {options
        .filter(id => id !== currentBadgeId)
        .map(id=>{
          const b = badgeMap[id]
          if(!b) return null
          return (
            <option key={id} value={id}>
              {b.description || b.name || b.label}
            </option>
          )
        })}
    </select>
  )
}