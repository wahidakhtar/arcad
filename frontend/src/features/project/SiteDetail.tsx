import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import { useStatusBadges } from "./hooks/useStatusBadges"
import DocBadgeSelectCell from "./components/DocBadgeSelectCell"
import FeFinancePanel from "./components/FeFinancePanel"

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

  const statusOptions = useStatusBadges(
    site.project_id,
    site.status_badge_id
  )

  const handleSave = async () => {
    await api.put(`/mi/site/${site.id}`, form)
    onUpdated()
    onBack()
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <button onClick={onBack}>← Back</button>

      <h3>Site Detail</h3>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select
          value={form.status_badge_id || ""}
          onChange={(e) =>
            setForm({ ...form, status_badge_id: Number(e.target.value) })
          }
        >
          <option value={site.status_badge_id}>
            {site.status_label}
          </option>
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.description}
            </option>
          ))}
        </select>

        <DocBadgeSelectCell
          site={site}
          field="po_status_badge_id"
          entityTypeId={4}
          reload={onUpdated}
        />

        {site.completion_date && (
          <>
            <DocBadgeSelectCell
              site={site}
              field="wcc_badge_id"
              entityTypeId={5}
              reload={onUpdated}
            />
            <DocBadgeSelectCell
              site={site}
              field="invoice_status_badge_id"
              entityTypeId={3}
              reload={onUpdated}
            />
          </>
        )}
      </div>

      <FeFinancePanel site={site} onUpdated={onUpdated} />

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
