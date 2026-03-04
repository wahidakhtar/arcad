import { useEffect,useState } from "react"
import { api } from "../../lib/api"

const badgeFields = ["status_badge_id","wcc"]

const PROJECT_ID_MAP:any = {
  mi: 1,
  md: 2,
  ma: 3,
  mc: 4,
  bb: 5
}

export default function useBadgeTransitions(sites:any[],projectCode:any){

  const [badgeMap,setBadgeMap]=useState<any>({})
  const [transitions,setTransitions]=useState<any>({})

  const projectId = PROJECT_ID_MAP[projectCode]

  useEffect(()=>{

    if(!sites || sites.length===0 || !projectId) return

    const load=async()=>{

      const badgeRes=await api.get("/badge/map")
      setBadgeMap(badgeRes.data||{})

      const map:any={}

      for(const s of sites){

        for(const field of badgeFields){

          const current=s[field]
          if(current==null) continue
          if(map[current]) continue

          const res=await api.get("/badge/transitions",{
            params:{
              entity_type_id: field==="status_badge_id" ? 2 : 5,
              project_id: projectId,
              current_badge_id: current
            }
          })

          map[current]=res.data||[]
        }
      }

      setTransitions(map)
    }

    load()

  },[sites,projectId])

  return {badgeMap,transitions}
}
