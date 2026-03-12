import { useEffect, useState } from "react"

interface RateRow {
  job_name: string
  effective_date: string
  unit_cost: number
}

export default function RateCardPage() {

  const [rows, setRows] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const token = localStorage.getItem("access_token")

    fetch("/api/v1/finance/rate-card", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log("rate-card data:", data)
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error("rate-card fetch failed:", err)
        setRows([])
      })
      .finally(() => {
        setLoading(false)
      })

  }, [])

  if (loading) {
    return <div>Loading rate card...</div>
  }

  return (
    <div>

      <h3>Rate Card</h3>

      {rows.length === 0 ? (
        <div>No rate card entries found.</div>
      ) : (

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Job</th>
              <th style={th}>Effective Date</th>
              <th style={th}>Unit Cost</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.job_name}</td>
                <td style={td}>{r.effective_date}</td>
                <td style={td}>{r.unit_cost}</td>
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