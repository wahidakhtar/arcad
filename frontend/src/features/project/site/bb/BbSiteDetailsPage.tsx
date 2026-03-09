import { useOutletContext } from "react-router-dom"
import { useState } from "react"
import { api } from "../../../../lib/api"
import BadgeCell from "../../../../components/BadgeCell"

export default function BbSiteDetailsPage(){

  const { site, reload, permissions, columns, projectCode } = useOutletContext<any>()

  const [form,setForm] = useState({...site})
  const [saving,setSaving] = useState(false)
  const [saved,setSaved] = useState(false)

  const badgeFields = ["status_badge_id","wcc"]

  const handleSave = async () => {

    setSaving(true)
    setSaved(false)

    const payload:any = {}

    for(const k in form){
      if(permissions?.[k]?.edit && form[k] !== site[k]){
        payload[k] = form[k]
      }
    }

    await api.put(`/site/${site.id}`,payload)

    setSaving(false)
    setSaved(true)

    reload()

    setTimeout(()=>setSaved(false),2000)
  }

  const renderField = (col:any) => {

    const key = col.column_name

    if(key==="id" || key==="project_id" || key==="fe_id") return null
    if(!permissions?.[key]?.view) return null

    const label = col.label || key
    const editable = permissions?.[key]?.edit
    const value = form[key] ?? ""

    if(badgeFields.includes(key)){
      return(
        <>
          <label>{label}</label>

          <BadgeCell
            site={site}
            field={key}
            reload={reload}
          />
        </>
      )
    }

    if(!editable){
      return (
        <>
          <label>{label}</label>
          <div>{value || "-"}</div>
        </>
      )
    }

    if(key.includes("date")){
      return (
        <>
          <label>{label}</label>
          <input
            type="date"
            value={value}
            onChange={e=>setForm({...form,[key]:e.target.value})}
          />
        </>
      )
    }

    if(typeof value === "number"){
      return (
        <>
          <label>{label}</label>
          <input
            type="number"
            value={value}
            onChange={e=>setForm({...form,[key]:Number(e.target.value)})}
          />
        </>
      )
    }

    return (
      <>
        <label>{label}</label>
        <input
          value={value}
          onChange={e=>setForm({...form,[key]:e.target.value})}
        />
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

      <br/>

      <button disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save"}
      </button>

      {saved && (
        <span style={{marginLeft:10,color:"green"}}>
          Saved
        </span>
      )}

    </div>
  )
}