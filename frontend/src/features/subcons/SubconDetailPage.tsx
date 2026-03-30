import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"

type SubconSummary = {
  id: number
  name: string
  subcon_type_label: string
  is_active: boolean
  created_at: string
}

type AssignedProject = { id: number; key: string; label: string }
type AssignedSite = {
  project_name: string
  circuit_id: string | null
  status: string
  cost: string | number
  paid: string | number
  balance: string | number
}
type SubconTransaction = {
  po_number: string | null
  invoice_number: string | null
  amount: string | number
  status: string
  project_or_subproject: string
}
type SubconDetailResponse = {
  subcon: SubconSummary
  assigned_projects: AssignedProject[]
  assigned_sites: AssignedSite[]
  transactions: SubconTransaction[]
}

type ProjectRow = { id: number; key: string; label: string; active: boolean }

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"

export default function SubconDetailPage() {
  const { subconId } = useParams()
  const { can } = useAuth()
  const canWrite = can("subproject", "write")

  const [detail, setDetail] = useState<SubconDetailResponse | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [removingProjectId, setRemovingProjectId] = useState<number | null>(null)
  const [assignError, setAssignError] = useState("")
  const [error, setError] = useState("")
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false)

  async function load() {
    if (!subconId) return
    setError("")
    try {
      const [subconResponse, projectsResponse] = await Promise.all([
        api.get(`/subcons/${subconId}`),
        api.get("/projects"),
      ])
      setDetail(subconResponse.data as SubconDetailResponse)
      setProjects((projectsResponse.data as ProjectRow[]).filter((project) => project.active))
    } catch {
      setError("Unable to load subcon details.")
    }
  }

  useEffect(() => {
    void load()
  }, [subconId])

  const assignedProjects = detail?.assigned_projects ?? []
  const availableProjects = useMemo(() => {
    const assignedIds = new Set(assignedProjects.map((project) => project.id))
    return projects.filter((project) => !assignedIds.has(project.id))
  }, [assignedProjects, projects])
  const selectedProjectLabel = projects.find((project) => String(project.id) === selectedProject)?.label ?? ""

  async function assignProject() {
    if (!subconId || !selectedProject) return
    setAssigning(true)
    setAssignError("")
    try {
      await api.post(`/subcons/${subconId}/projects`, { project_id: Number(selectedProject) })
      setSelectedProject("")
      setAssignConfirmOpen(false)
      await load()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setAssignError(detail ?? "Failed to assign project.")
    } finally {
      setAssigning(false)
    }
  }

  async function removeProject(projectId: number) {
    if (!subconId) return
    setRemovingProjectId(projectId)
    setAssignError("")
    try {
      const response = await api.delete(`/subcons/${subconId}/projects/${projectId}`)
      setDetail(response.data as SubconDetailResponse)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setAssignError(detail ?? "Failed to remove project.")
    } finally {
      setRemovingProjectId(null)
    }
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!detail) return <div className="p-6 text-jscolors-text/50">Loading...</div>

  const { subcon, assigned_sites: assignedSites, transactions } = detail

  return (
    <DetailPageLayout
      title={subcon.name}
      subtitle="Subcontractor"
      backHref="/subcons"
      actions={canWrite ? (
        <Button
          type="button"
          disabled={!availableProjects.length}
          onClick={() => {
            setAssignError("")
            setAssignConfirmOpen(true)
          }}
        >
          Assign Project
        </Button>
      ) : null}
    >
      <Modal
        isOpen={assignConfirmOpen}
        title="Assign Project"
        onClose={() => {
          setAssignConfirmOpen(false)
          setAssignError("")
          setSelectedProject("")
        }}
        size="sm"
        submitLabel="Assign"
        onSubmit={() => void assignProject()}
        isSubmitting={assigning}
      >
        <div className="space-y-4">
          {availableProjects.length ? (
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className={fieldCls}
            >
              <option value="">Select Project</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.label}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-jscolors-text/70">No unassigned projects available.</p>
          )}
          {selectedProject ? (
            <p className="text-sm text-jscolors-text/70">
              Assign <span className="font-semibold">{selectedProjectLabel}</span> to this subcon?
            </p>
          ) : null}
          {assignError ? <p className="text-sm text-red-600">{assignError}</p> : null}
        </div>
      </Modal>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Identity</p>
          <div className="mt-6 space-y-3">
            {[
              { label: "Type", value: subcon.subcon_type_label },
              { label: "Status", value: subcon.is_active ? "Active" : "Inactive" },
              { label: "Created", value: new Date(subcon.created_at).toLocaleDateString("en-IN") },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[18px] border border-jscolors-crimson/10 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{label}</div>
                <div className="mt-1 text-sm text-jscolors-text">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Assigned Projects</p>
            {assignError ? <p className="text-sm text-red-600">{assignError}</p> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {assignedProjects.length ? assignedProjects.map((project) => (
              <div
                key={project.id}
                className="inline-flex items-center gap-2 rounded-full border border-jscolors-crimson/12 bg-white px-4 py-2 text-sm text-jscolors-text"
              >
                <span>{project.label}</span>
                {canWrite ? (
                  <button
                    type="button"
                    className="text-base leading-none text-jscolors-crimson transition hover:opacity-70 disabled:opacity-40"
                    onClick={() => void removeProject(project.id)}
                    disabled={removingProjectId === project.id}
                    aria-label={`Remove ${project.label}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )) : (
              <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-3 text-sm text-jscolors-text/60">
                No projects assigned
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Assigned Sites</p>
        <div className="mt-5">
          <DataTable
            columns={[
              { key: "project_name", label: "Project", minWidth: 180 },
              { key: "circuit_id", label: "Circuit ID", minWidth: 180 },
              { key: "status", label: "Status", minWidth: 140 },
              { key: "cost", label: "Cost", align: "right", minWidth: 140 },
              { key: "paid", label: "Paid", align: "right", minWidth: 140 },
              { key: "balance", label: "Balance", align: "right", minWidth: 140 },
            ]}
            rows={assignedSites as Array<Record<string, unknown>>}
            emptyState={<div className="text-center text-sm text-jscolors-text/50">No assigned sites.</div>}
          />
        </div>
      </section>

      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Transactions</p>
        <div className="mt-5">
          <DataTable
            columns={[
              { key: "po_number", label: "PO Number", minWidth: 180 },
              { key: "invoice_number", label: "Invoice Number", minWidth: 180 },
              { key: "amount", label: "Amount", align: "right", minWidth: 140 },
              { key: "status", label: "Status", minWidth: 140 },
              { key: "project_or_subproject", label: "Project/Subproject", minWidth: 240 },
            ]}
            rows={transactions as Array<Record<string, unknown>>}
            emptyState={<div className="text-center text-sm text-jscolors-text/50">No transactions found.</div>}
          />
        </div>
      </section>
    </DetailPageLayout>
  )
}
