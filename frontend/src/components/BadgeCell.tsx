import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { useParams } from "react-router-dom"

export default function BadgeCell({
  site,
  field,
  reload,
  permissions
}: any){

  const { projectCode } = useParams()

  const [badgeMap, setBadgeMap] = useState<any>({})
  const [options, setOptions] = useState<number[]>([])

  const currentBadgeId = site[field]

  const fieldPerm = permissions?.[field] || {}
  const canEdit = fieldPerm.edit === true

  useEffect(()=>{

    let mounted = true

    api.get("/badge/map").then(res=>{
      if(mounted){
        setBadgeMap(res.data || {})
      }
    })

    return ()=>{ mounted = false }

  },[])

  const badge = badgeMap[currentBadgeId]

  const entityTypeId = badge?.type

  useEffect(()=>{

    if(!currentBadgeId || !entityTypeId) return

    let mounted = true

    api.get("/badge/transitions",{
      params:{
        entity_type_id: entityTypeId,
        current_badge_id: currentBadgeId
      }
    }).then(res=>{
      if(!mounted) return

      const ids = (res.data || []).map((r:any)=>r.id)
      setOptions(ids)
    })

    return ()=>{ mounted = false }

  },[currentBadgeId, entityTypeId])

  const update = async(v:number)=>{

    if(!canEdit) return

    await api.put(`/${projectCode}/site/${site.id}`,{
      [field]: v
    })

    reload()
  }

  if(!badge){
    return "-"
  }

  // read-only display
  if(!canEdit){
    return badge.label
  }

  return(
    <select
      value={currentBadgeId || ""}
      style={{ backgroundColor: badge.color, color: "#000" }}
      onChange={e=>update(Number(e.target.value))}
    >
      <option value={currentBadgeId}>
        {badge.label}
      </option>

      {options
        .filter(id => id !== currentBadgeId)
        .map(id=>{
          const b = badgeMap[id]
          if(!b) return null
          return (
            <option key={id} value={id}>
              {b.label}
            </option>
          )
        })}
    </select>
  )
}