import { useOutletContext } from "react-router-dom"
import { useState } from "react"
import { api } from "../../../../lib/api"
import DocBadgeSelectCell from "../../components/DocBadgeSelectCell"
import StatusBadgeSelectCell from "../../components/StatusBadgeSelectCell"

export default function MaSiteDetailsPage() {
  const { site, reload } = useOutletContext<any>()
  const [form, setForm] = useState({ ...site })

  const handleSave = async () => {
    await api.put(`/site/${site.id}`, form)
    reload()
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>

        <StatusBadgeSelectCell
          site={site}
          reload={reload}
        />

        <DocBadgeSelectCell
          site={site}
          field="po_status_badge_id"
          entityTypeId={4}
          reload={reload}
        />

        {site.completion_date && (
          <>
            <DocBadgeSelectCell
              site={site}
              field="wcc_badge_id"
              entityTypeId={5}
              reload={reload}
            />
            <DocBadgeSelectCell
              site={site}
              field="invoice_status_badge_id"
              entityTypeId={3}
              reload={reload}
            />
          </>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: "10px",
        marginTop: 30
      }}>
        <label>CKT ID</label>
        <input value={form.ckt_id || ""} onChange={e => setForm({...form, ckt_id: e.target.value})} />

        <label>Customer</label>
        <input value={form.customer || ""} onChange={e => setForm({...form, customer: e.target.value})} />

        <label>Receiving Date</label>
        <input type="date" value={form.receiving_date || ""} onChange={e => setForm({...form, receiving_date: e.target.value})} />

        <label>Permission Date</label>
        <input type="date" value={form.permission_date || ""} onChange={e => setForm({...form, permission_date: e.target.value})} />

        <label>Completion Date</label>
        <input type="date" value={form.completion_date || ""} onChange={e => setForm({...form, completion_date: e.target.value})} />

        <label>Height (mtr)</label>
        <input type="number" value={form.height_m || ""} onChange={e => setForm({...form, height_m: e.target.value})} />

        <label>Progress</label>
        <input value={form.progress || ""} onChange={e => setForm({...form, progress: e.target.value})} />
      </div>

      <br />
      <button onClick={handleSave}>Save</button>
    </div>
  )
}
