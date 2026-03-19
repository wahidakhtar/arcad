import { useListPage } from "../../hooks/useListPage"
import DataTable from "../../components/ui/DataTable"

type RateCardRow = {
  id: number
  job_id: number
  job_key: string
  date: string
  cost: number | string
}

export default function RateCardPage() {
  const { data, loading, error } = useListPage<RateCardRow[]>({ endpoint: "/billing/rate-card" })

  if (loading) return <div className="glass-panel p-6">Loading rate card...</div>
  if (error) return <div className="glass-panel p-6 text-red-700">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Billing</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Rate Card</h1>
      </div>
      <DataTable
        columns={[
          { key: "job_key", label: "Job" },
          { key: "date", label: "Effective From" },
          { key: "cost", label: "Rate (₹)" },
        ]}
        rows={(data ?? []) as unknown as Record<string, unknown>[]}
      />
    </div>
  )
}
