import { useState } from "react"

import { useListPage } from "../../hooks/useListPage"
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

  const rows = data ?? []

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

      <div className="overflow-x-auto rounded-[24px] border border-jscolors-crimson/10 bg-white">
        <table className="min-w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <thead>
            <tr className="border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03]">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50">Job</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50">Effective From</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-jscolors-crimson/8">
                <td className="px-5 py-4 text-sm text-jscolors-text">{row.job_label}</td>
                <td className="px-5 py-4 text-sm text-jscolors-text">{row.date}</td>
                <td className="px-5 py-4 text-right font-mono text-sm text-jscolors-text">
                  ₹ {Number(row.cost).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-sm text-jscolors-text/50">No rates configured yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
