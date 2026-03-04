import { useOutletContext } from "react-router-dom"
import { useState } from "react"
import { api } from "../../../../lib/api"

export default function MiSiteDetailsPage(){

  const { site, reload, permissions, columns } = useOutletContext<any>()
  const [form,setForm] = useState({...site})

  const handleSave = async () => {

    const payload:any = {}

    for(const k in form){
      if(permissions?.[k]?.edit){
        payload[k] = form[k]
      }
    }

    await api.put(`/mi/site/${site.id}`,payload)

    reload()
  }

  const renderField = (col:any) => {

    const key = col.column_name

    if(key==="id" || key==="project_id" || key==="fe_id") return null

    if(!permissions?.[key]?.view) return null

    const label = col.label || key

    const editable = permissions?.[key]?.edit

    const value = form[key] ?? ""

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
            onChange={e=>setForm({...form,[key]:e.target.value})}
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

      <button onClick={handleSave}>
        Save
      </button>

    </div>
  )
}
