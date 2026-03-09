import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function FeFinancePanel({ site, projectCode, onUpdated }: any) {

  const [feList, setFeList] = useState<any[]>([])
  const [feHistory, setFeHistory] = useState<any[]>([])
  const [financeHistory, setFinanceHistory] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const [selectedFe, setSelectedFe] = useState<number | null>(null)
  const [closeCost, setCloseCost] = useState<Record<number, number>>({})
  const [requestData, setRequestData] = useState<Record<number, any>>({})

  const load = async () => {

    try {
      const res = await api.get(`/fe/list/${projectCode}`)
      setFeList(res.data || [])
    } catch (err) {
      console.error("FE list load failed", err)
    }

    try {
      const res = await api.get(`/fe/history/${projectCode}/${site.id}`)
      setFeHistory(res.data || [])
    } catch (err) {
      console.error("FE history load failed", err)
    }

    try {
      const res = await api.get(`/finance/site/${projectCode}/${site.id}`)
      setFinanceHistory(res.data?.transactions || [])
      setSummary(res.data?.summary || null)
    } catch (err: any) {
      if (err?.response?.status === 403) {
        console.warn("Finance access denied")
      } else {
        console.error("Finance load failed", err)
      }
    }
  }

  useEffect(() => {
    if (!site || !projectCode) return
    load()
  }, [site, projectCode])

  const assign = async () => {

    if (!selectedFe) return

    await api.post(`/fe/assign/${projectCode}/${site.id}`, {
      fe_id: selectedFe
    })

    await load()
    onUpdated?.()
  }

  const close = async (row: any) => {

    const cost = closeCost[row.id]
    if (cost === undefined) return

    await api.post(`/fe/remove/${projectCode}/${site.id}`, {
      final_fe_cost: Number(cost)
    })

    await load()
    onUpdated?.()
  }

  const request = async (row: any) => {

    const data = requestData[row.fe_id]
    if (!data?.amount || !data?.type) return

    await api.post("/finance/request", {
      project_code: projectCode,
      site_id: site.id,
      fe_id: row.fe_id,
      amount: Number(data.amount),
      type: data.type,
      approval: Boolean(data.approval)
    })

    await load()
  }

  return (
    <div style={{ marginTop: 30 }}>

      <h4>Site Financial Summary</h4>

      {summary && (
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <div><strong>Base Budget:</strong> {summary.base_budget}</div>
          <div><strong>Budget:</strong> {summary.budget}</div>
          <div><strong>Cost:</strong> {summary.cost}</div>
          <div><strong>Paid:</strong> {summary.paid}</div>
          <div><strong>Balance:</strong> {summary.balance}</div>
        </div>
      )}

      <h4>FE Management</h4>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select
          value={selectedFe ?? ""}
          onChange={e => setSelectedFe(Number(e.target.value))}
        >
          <option value="">Assign FE</option>
          {feList.map((f: any) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
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
                      style={{ width: 100 }}
                      onChange={e =>
                        setCloseCost(prev => ({
                          ...prev,
                          [row.id]: Number(e.target.value)
                        }))
                      }
                    />

                    <button onClick={() => close(row)}>
                      Close
                    </button>
                  </>
                )}
              </td>

              <td>
                {row.is_active && (
                  <>
                    <input
                      type="number"
                      placeholder="Amount"
                      style={{ width: 80 }}
                      onChange={e =>
                        setRequestData(prev => ({
                          ...prev,
                          [row.fe_id]: {
                            ...prev[row.fe_id],
                            amount: Number(e.target.value)
                          }
                        }))
                      }
                    />

                    <select
                      onChange={e =>
                        setRequestData(prev => ({
                          ...prev,
                          [row.fe_id]: {
                            ...prev[row.fe_id],
                            type: e.target.value
                          }
                        }))
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
                          setRequestData(prev => ({
                            ...prev,
                            [row.fe_id]: {
                              ...prev[row.fe_id],
                              approval: e.target.checked
                            }
                          }))
                        }
                      />
                      Approve
                    </label>

                    <button onClick={() => request(row)}>
                      Request
                    </button>
                  </>
                )}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ marginTop: 30 }}>
        Finance Requests
      </h4>

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
                    await api.put(`/finance/state/${f.id}`, {
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