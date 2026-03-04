import { Link } from "react-router-dom"
import { api } from "../../lib/api"

export default function CellRenderer({
  site,
  field,
  badgeMap,
  transitions,
  isBadge,
  refresh,
  projectCode,
  permissions
}: any){

  const value = site[field.column_name]

  console.log("PERMISSIONS:", permissions)

  if(field.column_name === "ckt_id"){

    if(value == null){
      return "-"
    }

    const canEdit = permissions?.ckt_id?.edit

    console.log("CKT EDIT PERMISSION:", canEdit)

    if(canEdit){
      return (
        <Link to={`/${projectCode}/site/${site.id}/details`}>
          {value}
        </Link>
      )
    }

    return value
  }

  if(isBadge){

    const badge = badgeMap[value]
    if(!badge) return "-"

    const options = transitions[value] || []

    const update = async(v:number)=>{
      await api.put(`/${projectCode}/site/${site.id}`,{[field.column_name]:v})
      refresh()
    }

    return(
      <select
        value={value ?? ""}
        style={{backgroundColor: badge.color}}
        onChange={e=>update(Number(e.target.value))}
      >
        <option value={value}>{badge.label}</option>

        {options
          .filter((o:any)=>o.id!==value)
          .map((o:any)=>(
            <option key={o.id} value={o.id}>
              {o.description}
            </option>
        ))}
      </select>
    )
  }

  return value ?? "-"
}
