import { useEffect, useState } from "react"
import { api } from "../../lib/api"

export default function PoInvoicePage() {

  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await api.get("/finance/po-invoice")
      setRows(res.data || [])
    } catch (err) {
      console.error("Failed to load PO/Invoice", err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateState = async (id: number, state: string) => {
    await api.put(`/finance/po-invoice/${id}`, { state })
    load()
  }

  if (loading) return <div>Loading PO/Invoice...</div>

  return (
    <div>

      <h3>PO / Invoice</h3>

      <table border={1} cellPadding={6}>

        <thead>
          <tr>
            <th>PO</th>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {rows.map((r: any) => (
            <tr key={r.id}>

              <td>{r.po_number}</td>
              <td>{r.invoice_number}</td>
              <td>{r.amount}</td>

              <td>
                <select
                  value={r.state}
                  onChange={e =>
                    updateState(r.id, e.target.value)
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="paid">Paid</option>
                </select>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  )
}