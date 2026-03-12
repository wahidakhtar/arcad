import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function AccountsPanel({ site, projectCode }: any) {

  const [transactions, setTransactions] = useState<any[]>([])

  const load = async () => {
    const res = await api.get(`/finance/site/${projectCode}/${site.id}`)
    setTransactions(res.data?.transactions || [])
  }

  useEffect(() => {
    if (!site || !projectCode) return
    load()
  }, [site, projectCode])

  const execute = async (row: any) => {
    await api.put(`/finance/state/${row.id}`, { state: "executed" })
    load()
  }

  const reject = async (row: any) => {
    await api.put(`/finance/state/${row.id}`, { state: "rejected" })
    load()
  }

  return (
    <div style={{ marginTop: 30 }}>

      <h4>Accounts Processing</h4>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>FE</th>
            <th>Amount</th>
            <th>Type</th>
            <th>State</th>
            <th>Approval</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((t:any)=>(
            <tr key={t.id}>

              <td>{t.fe_name}</td>
              <td>{t.amount}</td>
              <td>{t.type}</td>
              <td>{t.state}</td>
              <td>{t.approval ? "Yes" : "No"}</td>

              <td>
                {t.state === "requested" && (
                  <>
                    <button onClick={()=>execute(t)}>Execute</button>
                    <button onClick={()=>reject(t)}>Reject</button>
                  </>
                )}
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  )
}