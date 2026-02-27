import { useState } from "react"
import { api } from "../../lib/api"

export default function SiteDetail({
  site,
  onBack,
  onUpdated,
}: {
  site: any
  onBack: () => void
  onUpdated: () => void
}) {
  const [form, setForm] = useState({ ...site })

  const handleSave = async () => {
    await api.put(`/v1/mi/site/${site.id}`, form)
    onUpdated()
    onBack()
  }

  return (
    <div>
      <button onClick={onBack}>← Back</button>
      <h3>Site Detail</h3>

      <div>
        <label>CKT</label>
        <input value={form.ckt_id || ""} onChange={e => setForm({...form, ckt_id: e.target.value})} />

        <label>Customer</label>
        <input value={form.customer || ""} onChange={e => setForm({...form, customer: e.target.value})} />

        <label>Status</label>
        <input value={form.status || ""} onChange={e => setForm({...form, status: e.target.value})} />

        <label>Height</label>
        <input value={form.height_m || ""} onChange={e => setForm({...form, height_m: e.target.value})} />

        <label>City</label>
        <input value={form.city || ""} onChange={e => setForm({...form, city: e.target.value})} />

        <label>LC</label>
        <input value={form.lc || ""} onChange={e => setForm({...form, lc: e.target.value})} />

        <label>Paid</label>
        <input value={form.paid || ""} onChange={e => setForm({...form, paid: e.target.value})} />
      </div>

      <button onClick={handleSave}>Save</button>
    </div>
  )
}
