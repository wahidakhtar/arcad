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
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      await api.put(`/v1/mi/site/${site.id}`, {
        ckt_id: form.ckt_id,
        customer: form.customer,
        receiving_date: form.receiving_date,
        permission_date: form.permission_date,
        completion_date: form.completion_date,
        height_m: form.height_m,
        address: form.address,
        city: form.city,
        lc: form.lc,
        progress: form.progress,
        fe: form.fe,
        paid: form.paid,
        po_no: form.po_no,
        invoice_no: form.invoice_no
      })

      onUpdated()
      onBack()
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Update failed"
      setError(message)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <button onClick={onBack}>← Back</button>

      <h3 style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        Site Detail

        {site.status_label && (
          <span style={{
            background: site.status_color,
            padding: "4px 8px",
            borderRadius: 4
          }}>
            {site.status_label}
          </span>
        )}

        {site.wcc_status && (
          <span style={{
            background: site.wcc_status_color,
            padding: "4px 8px",
            borderRadius: 4
          }}>
            WCC: {site.wcc_status}
          </span>
        )}

        {site.po_status && (
          <span style={{
            background: site.po_status_color,
            padding: "4px 8px",
            borderRadius: 4
          }}>
            PO: {site.po_status}
          </span>
        )}

        {site.invoice_status && (
          <span style={{
            background: site.invoice_status_color,
            padding: "4px 8px",
            borderRadius: 4
          }}>
            Invoice: {site.invoice_status}
          </span>
        )}
      </h3>

      {error && (
        <div style={{
          background: "#ffdddd",
          border: "1px solid red",
          padding: 10,
          marginBottom: 15
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: "8px"
      }}>
        <label>CKT ID</label>
        <input value={form.ckt_id || ""} onChange={e => setForm({...form, ckt_id: e.target.value})} />

        <label>Customer</label>
        <input value={form.customer || ""} onChange={e => setForm({...form, customer: e.target.value})} />

        <label>Receiving Date</label>
        <input type="date" value={form.receiving_date || ""} onChange={e => setForm({...form, receiving_date: e.target.value})} />

        <label>Permission Date</label>
        <input type="date" value={form.permission_date || ""} onChange={e => setForm({...form, permission_date: e.target.value})} />

        <label>EDD</label>
        <input type="date" value={form.edd || ""} disabled />

        <label>Completion Date</label>
        <input type="date" value={form.completion_date || ""} onChange={e => setForm({...form, completion_date: e.target.value})} />

        <label>Height (mtr)</label>
        <input type="number" value={form.height_m || ""} onChange={e => setForm({...form, height_m: e.target.value})} />

        <label>Address</label>
        <textarea value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} />

        <label>City</label>
        <input value={form.city || ""} onChange={e => setForm({...form, city: e.target.value})} />

        <label>LC</label>
        <input value={form.lc || ""} onChange={e => setForm({...form, lc: e.target.value})} />

        <label>Progress</label>
        <input value={form.progress || ""} onChange={e => setForm({...form, progress: e.target.value})} />

        <label>FE</label>
        <input value={form.fe || ""} onChange={e => setForm({...form, fe: e.target.value})} />

        <label>Paid</label>
        <input type="number" value={form.paid || ""} onChange={e => setForm({...form, paid: e.target.value})} />

        <label>Budget</label>
        <div>{site.budget}</div>

        <label>Balance</label>
        <div>{site.balance}</div>
      </div>

      <br />
      <button onClick={handleSave}>Save</button>
    </div>
  )
}
