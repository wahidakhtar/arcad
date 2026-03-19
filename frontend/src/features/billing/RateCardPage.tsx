import { useState } from "react"

import { useListPage } from "../../hooks/useListPage"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import { api } from "../../lib/api"

type RateCardRow = {
  id: number
  job_id: number
  job_key: string
  job_label: string
  date: string
  cost: number | string
}

type JobEntry = {
  id: number
  job_key: string
  label: string
}

export default function RateCardPage() {
  const { data, loading, error, refetch } = useListPage<RateCardRow[]>({ endpoint: "/billing/rate-card" })
  const [openAdd, setOpenAdd] = useState(false)
  const [jobs, setJobs] = useState<JobEntry[]>([])
  const [form, setForm] = useState({ job_id: "", date: "", cost: "" })
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState("")

  function openModal() {
    void api.get<JobEntry[]>("/billing/jobs").then((res) => {
      setJobs(Array.isArray(res.data) ? res.data : [])
    })
    setForm({ job_id: "", date: "", cost: "" })
    setAddError("")
    setOpenAdd(true)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.job_id || !form.date || !form.cost) {
      setAddError("All fields are required.")
      return
    }
    setSubmitting(true)
    setAddError("")
    void api
      .post("/billing/rate-card", { job_id: Number(form.job_id), date: form.date, cost: Number(form.cost) })
      .then(() => {
        setOpenAdd(false)
        refetch()
      })
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setAddError(err.response?.data?.detail ?? "Unable to add rate.")
      })
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="glass-panel p-6">Loading rate card...</div>
  if (error) return <div className="glass-panel p-6 text-red-700">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Billing</p>
          <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Rate Card</h1>
        </div>
        <button type="button" className="premium-button" onClick={openModal}>
          + Add Rate
        </button>
      </div>

      <Modal open={openAdd} title="Add Rate" onClose={() => setOpenAdd(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Job</span>
            <select
              value={form.job_id}
              onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Select job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Effective From</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Rate (₹)</span>
            <input
              type="number"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              placeholder="e.g. 2600"
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          {addError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addError}</div> : null}
          <button type="submit" className="premium-button w-full" disabled={submitting}>
            {submitting ? "Adding..." : "Add Rate"}
          </button>
        </form>
      </Modal>

      <DataTable
        columns={[
          { key: "job_label", label: "Job" },
          { key: "date", label: "Effective From" },
          {
            key: "cost",
            label: "Rate",
            render: (value) => (
              <div className="text-right font-mono">₹ {Number(value).toLocaleString("en-IN")}</div>
            ),
          },
        ]}
        rows={(data ?? []) as unknown as Record<string, unknown>[]}
      />
    </div>
  )
}
