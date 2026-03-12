import { useEffect, useState } from "react"

interface RequestRow {
  id: number
  project_id: number
  site_id: number
  type: string
  state: string
  amount: number
  approval: boolean
}

export default function FinanceRequestsPage() {

  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const token = localStorage.getItem("access_token")

    fetch("/api/v1/finance/requests", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log("finance requests:", data)
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error("request fetch failed:", err)
        setRows([])
      })
      .finally(() => {
        setLoading(false)
      })

  }, [])

  if (loading) return <div>Loading requests...</div>

  return (
    <div>

      <h3>Finance Requests</h3>

      {rows.length === 0 ? (
        <div>No requests found.</div>
      ) : (

        <table style={{ width: "100%", borderCollapse: "collapse" }}>

          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Project</th>
              <th style={th}>Site</th>
              <th style={th}>Type</th>
              <th style={th}>Amount</th>
              <th style={th}>State</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={td}>{r.id}</td>
                <td style={td}>{r.project_id}</td>
                <td style={td}>{r.site_id}</td>
                <td style={td}>{r.type}</td>
                <td style={td}>{r.amount}</td>
                <td style={td}>{r.state}</td>
              </tr>
            ))}
          </tbody>

        </table>

      )}

    </div>
  )
}

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #ccc",
  padding: "8px"
}

const td = {
  borderBottom: "1px solid #eee",
  padding: "8px"
}