import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function FeFinancePanel({ site, onUpdated }: any) {
  const [feList, setFeList] = useState<any[]>([])
  const [feHistory, setFeHistory] = useState<any[]>([])
  const [selectedFe, setSelectedFe] = useState<number | null>(null)
  const [closeCost, setCloseCost] = useState<Record<number, number>>({})
  const [requestData, setRequestData] = useState<Record<number, any>>({})
  const [financeHistory, setFinanceHistory] = useState<any[]>([])

  const load = async () => {
    const feRes = await api.get(`/api/v1/fe/list/${site.project_id}`)
    const histRes = await api.get(`/api/v1/fe/history/${site.project_id}/${site.id}`)
    const finRes = await api.get(`/api/v1/finance/site/${site.project_id}/${site.id}`)
    setFeList(feRes.data)
    setFeHistory(histRes.data)
    setFinanceHistory(finRes.data)
  }

  useEffect(() => { load() }, [site])

  const assign = async () => {
    if (!selectedFe) return
    await api.post("/fe/assign", {
      project_id: site.project_id,
      site_id: site.id,
      fe_id: selectedFe
    })
    await load()
    onUpdated()
  }

  const close = async (row: any) => {
    const cost = closeCost[row.id]
    if (cost === undefined || cost === null || cost === "") return
    await api.post("/fe/remove", {
      project_id: site.project_id,
      site_id: site.id,
      final_fe_cost: Number(cost)
    })
    await load()
    onUpdated()
  }

  const request = async (row: any) => {
    const data = requestData[row.fe_id]
    if (!data?.amount || !data?.type) return

    await api.post("/finance/request", {
      project_id: site.project_id,
      site_id: site.id,
      fe_id: row.fe_id,
      amount: data.amount,
      type: data.type,
      approval: data.approval || false
    })

    await load()
  }

  return (
    <div style={{ marginTop: 30 }}>
      <h4>FE Management</h4>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select value={selectedFe || ""} onChange={e => setSelectedFe(Number(e.target.value))}>
          <option value="">Assign FE</option>
          {feList.map((f: any) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button onClick={assign}>Assign</button>
      </div>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>FE</th>
            <th>Allocated</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Close</th>
            <th>Request</th>
          </tr>
        </thead>
        <tbody>
          {feHistory.map((row: any) => (
            <tr key={row.id}>
              <td>{row.fe_name}</td>
              <td>{row.final_fe_cost}</td>
              <td>{row.paid}</td>
              <td>{row.balance}</td>
              <td>{row.is_active ? "Active" : "Closed"}</td>

              <td>
                {row.is_active && (
                  <>
                    <input
                      type="number"
                      placeholder="Final cost"
                      onChange={e =>
                        setCloseCost({ ...closeCost, [row.id]: Number(e.target.value) })
                      }
                      style={{ width: 100 }}
                    />
                    <button onClick={() => close(row)}>Close</button>
                  </>
                )}
              </td>

              <td>
                {row.is_active && (
                  <>
                    <input
                      type="number"
                      placeholder="Amount"
                      onChange={e =>
                        setRequestData({
                          ...requestData,
                          [row.fe_id]: {
                            ...requestData[row.fe_id],
                            amount: Number(e.target.value)
                          }
                        })
                      }
                      style={{ width: 80 }}
                    />
                    <select
                      onChange={e =>
                        setRequestData({
                          ...requestData,
                          [row.fe_id]: {
                            ...requestData[row.fe_id],
                            type: e.target.value
                          }
                        })
                      }
                    >
                      <option value="">Type</option>
                      <option value="payment">Payment</option>
                      <option value="surcharge">Surcharge</option>
                      <option value="refund">Refund</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        onChange={e =>
                          setRequestData({
                            ...requestData,
                            [row.fe_id]: {
                              ...requestData[row.fe_id],
                              approval: e.target.checked
                            }
                          })
                        }
                      />
                      Approve
                    </label>
                    <button onClick={() => request(row)}>Request</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      <h4 style={{ marginTop: 30 }}>Finance Requests</h4>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>FE</th>
            <th>Amount</th>
            <th>Type</th>
            <th>State</th>
            <th>Approval</th>
          </tr>
        </thead>
        <tbody>
          {financeHistory.map((f: any) => (
            <tr key={f.id}>
              <td>{f.fe_name}</td>
              <td>{f.amount}</td>
              <td>{f.type}</td>
              <td>
                <select
                  value={f.state}
                  onChange={async (e) => {
                    await api.put(`/api/v1/finance/state/${f.id}`, {
                      state: e.target.value
                    })
                    load()
                  }}
                >
                  <option value="requested">Requested</option>
                  <option value="rejected">Rejected</option>
                  <option value="executed">Executed</option>
                </select>
              </td>
              <td>{f.approval ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
