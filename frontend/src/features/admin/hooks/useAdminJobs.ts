import { useEffect, useState } from "react"

import { api } from "../../../lib/api"
import type { Job } from "../types"

export default function useAdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [editDraft, setEditDraft] = useState({ label: "", scale_by: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [modalError, setModalError] = useState("")

  useEffect(() => {
    void api
      .get<Job[]>("/admin/jobs")
      .then((response) => setJobs(response.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load jobs"),
      )
  }, [])

  function openEdit(job: Job) {
    setEditingJob(job)
    setEditDraft({ label: job.label, scale_by: job.scale_by })
    setModalError("")
  }

  function closeEdit() {
    setEditingJob(null)
  }

  function handleSave() {
    if (!editingJob) return
    setSaving(true)
    setModalError("")
    void api
      .patch(`/admin/jobs/${editingJob.id}`, { label: editDraft.label, scale_by: editDraft.scale_by })
      .then(() => {
        setJobs((prev) => prev.map((job) => (job.id === editingJob.id ? { ...job, label: editDraft.label, scale_by: editDraft.scale_by } : job)))
        setEditingJob(null)
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setModalError(err.response?.data?.detail ?? "Failed to save job"),
      )
      .finally(() => setSaving(false))
  }

  return { jobs, editingJob, editDraft, setEditDraft, saving, error, modalError, openEdit, closeEdit, handleSave }
}
