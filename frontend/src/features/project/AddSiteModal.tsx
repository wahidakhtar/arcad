import { useState } from "react"
import { getProjectForm } from "./forms/formRegistry"
import { createMiSite } from "./services/miClient"

export default function AddSiteModal({
  project_id,
  onClose,
  onCreated,
}: {
  project_id: string
  onClose: () => void
  onCreated: () => void
}) {

  const fields = getProjectForm(project_id)
  const [form, setForm] = useState<any>({})

  const handleSubmit = async () => {

    const payload:any = {
      project_code: project_id,
      ...form
    }

    if (payload.height_m)
      payload.height_m = Number(payload.height_m)

    const result = await createMiSite(payload)

    if (result.success) {
      onCreated()
      onClose()
      return
    }

    alert(JSON.stringify(result.error))
  }

  return (
    <div style={{
      position:"fixed",
      top:100,
      left:300,
      background:"white",
      padding:20,
      border:"1px solid black"
    }}>

      <h3>Add Site</h3>

      {fields.map((f:any)=>{

        if(f.type==="date"){
          return(
            <input
              key={f.name}
              type="date"
              placeholder={f.label}
              onChange={(e)=>setForm({...form,[f.name]:e.target.value})}
            />
          )
        }

        return(
          <input
            key={f.name}
            placeholder={f.label}
            onChange={(e)=>setForm({...form,[f.name]:e.target.value})}
          />
        )

      })}

      <br/>

      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>

    </div>
  )
}
