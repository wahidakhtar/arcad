import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { api } from "../../lib/api"

type RateRow = {
  id: number
  job_id: number
  job_key: string
  job_label: string
  date: string
  cost: number | string
}

export default function RateHistoryPage() {
  const { job_key } = useParams<{ job_key: string }>()
  const navigate = useNavigate()
  const [rows, setRows] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!job_key) return
    setLoading(true)
    void api
      .get<RateRow[]>(`/billing/rate-card/history/${job_key}`)
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load rate history."))
      .finally(() => setLoading(false))
  }, [job_key])

  const jobLabel = rows[0]?.job_label ?? job_key ?? ""

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <ListPageLayout
      actions={
        <button
          type="button"
          className="text-sm text-jscolors-crimson/70 hover:text-jscolors-crimson underline"
          onClick={() => navigate("/billing/rate-card")}
        >
          ← Back to Rate Card
        </button>
      }
    >
      <div className="mb-4 px-1 text-sm font-semibold text-jscolors-text/60">{jobLabel} — rate history</div>
      <DataTable
        columns={[
          { key: "date", label: "Effective From", minWidth: 160 },
          {
            key: "cost",
            label: "Rate",
            minWidth: 120,
            align: "right",
            render: (value) => <>₹ {Number(value).toLocaleString("en-IN")}</>,
          },
        ]}
        rows={rows as unknown as Record<string, unknown>[]}
        emptyState={<span className="text-jscolors-text/50">No history.</span>}
      />
    </ListPageLayout>
  )
}
