import { useState } from "react"
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
  const [form, setForm] = useState({
    ckt_id: "",
    customer: "",
    receiving_date: "",
    height_m: "",
    city: "",
    lc: "",
  })

  const handleSubmit = async () => {
    const result = await createMiSite({
      project_id: Number(project_id),
      ...form,
      height_m: Number(form.height_m),
    })

    if (result.success) {
      onCreated()
      onClose()
      return
    }

    if (result.duplicate) {
      const s = result.existing_site
      alert(
        `Duplicate CKT ID Detected\n\n` +
        `CKT: ${s.ckt_id}\n` +
        `Customer: ${s.customer}\n` +
        `City: ${s.city}\n` +
        `Receiving Date: ${s.receiving_date}`
      )
      return
    }

    alert(result.error)
  }

  return (
    <div style={{ position: "fixed", top: 100, left: 300, background: "white", padding: 20, border: "1px solid black" }}>
      <h3>Add Site</h3>
      <input placeholder="CKT ID" onChange={e => setForm({...form, ckt_id: e.target.value})} />
      <input placeholder="Customer" onChange={e => setForm({...form, customer: e.target.value})} />
      <input type="date" onChange={e => setForm({...form, receiving_date: e.target.value})} />
      <input placeholder="Height" onChange={e => setForm({...form, height_m: e.target.value})} />
      <input placeholder="City" onChange={e => setForm({...form, city: e.target.value})} />
      <input placeholder="LC" onChange={e => setForm({...form, lc: e.target.value})} />
      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}
