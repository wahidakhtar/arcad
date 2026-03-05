import { useOutletContext } from "react-router-dom"
import BadgeCell from "../../../../components/BadgeCell"

export default function MaSiteDetailsPage(){

  const { site, reload, permissions, columns } = useOutletContext<any>()

  const badgeFields = ["status_badge_id","wcc"]

  const entityMap:any = {
    status_badge_id: 2,
    wcc: 5
  }

  const renderField = (col:any) => {

    const key = col.column_name
    const value = site[key]

    if(key==="id" || key==="project_id" || key==="fe_id") return null
    if(!permissions?.[key]?.view) return null

    if(badgeFields.includes(key)){
      return(
        <>
          <label>{col.label || key}</label>

          <BadgeCell
            site={site}
            field={key}
            entityTypeId={entityMap[key]}
            reload={reload}
          />
        </>
      )
    }

    return(
      <>
        <label>{col.label || key}</label>
        <div>{value || "-"}</div>
      </>
    )
  }

  return(

    <div style={{maxWidth:1100}}>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"200px 1fr",
          gap:"10px",
          marginTop:30
        }}
      >
        {columns?.map((c:any)=>(
          <div key={c.column_name} style={{display:"contents"}}>
            {renderField(c)}
          </div>
        ))}
      </div>

    </div>
  )
}