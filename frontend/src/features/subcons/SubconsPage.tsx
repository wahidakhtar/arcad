import { useState } from "react"

import Button from "../../components/ui/Button"
import DataTable from "../../components/ui/DataTable"
import ListPageLayout from "../../components/layout/ListPageLayout"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import { useListPage } from "../../hooks/useListPage"
import { api } from "../../lib/api"

type SubconRow = {
  id: number
  name: string
  subcon_type_label: string
  is_active: boolean
  projects: Array<{ id: number; label: string }>
}

const SUBCON_TYPE_OPTIONS = [
  { id: 1, label: "ISP" },
  { id: 2, label: "Field Engineer" },
]

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45"

export default function SubconsPage() {
  const { can } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", subcon_type_id: "1" })
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState("")

  const { data: subcons, loading, error, refetch } = useListPage<SubconRow[]>({
    endpoint: "/subcons",
  })

  if (!can("subproject", "read")) {
    return <div className="p-6 text-red-600">Access denied.</div>
  }

  if (loading && !subcons) return <div className="p-6 text-jscolors-text/50">Loading subcons...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  async function createSubcon() {
    if (!createForm.name.trim()) return
    setCreateSaving(true)
    setCreateError("")
    try {
      await api.post("/subcons", {
        name: createForm.name.trim(),
        subcon_type_id: Number(createForm.subcon_type_id),
      })
      setCreateForm({ name: "", subcon_type_id: "1" })
      setCreateOpen(false)
      refetch()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setCreateError(detail ?? "Failed to create subcon.")
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <ListPageLayout
      actions={
        <Button
          type="button"
          onClick={() => {
            setCreateForm({ name: "", subcon_type_id: "1" })
            setCreateError("")
            setCreateOpen(true)
          }}
        >
          Create Subcon
        </Button>
      }
    >
      <Modal open={createOpen} title="Create Subcon" onClose={() => setCreateOpen(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Subcon Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
              className={fieldCls}
              placeholder="Enter subcon name"
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              value={createForm.subcon_type_id}
              onChange={(e) => setCreateForm((c) => ({ ...c, subcon_type_id: e.target.value }))}
              className={fieldCls}
            >
              {SUBCON_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={createSaving || !createForm.name.trim()}
              onClick={() => void createSubcon()}
            >
              {createSaving ? "Creating..." : "Create Subcon"}
            </Button>
          </div>
        </div>
      </Modal>

      <DataTable
        columns={[
          { key: "name", label: "Name", minWidth: 180 },
          { key: "subcon_type_label", label: "Type", minWidth: 120 },
          {
            key: "projects",
            label: "Projects",
            minWidth: 200,
            render: (value) => {
              const projects = value as Array<{ id: number; label: string }>
              return projects.length ? projects.map((p) => p.label).join(", ") : "—"
            },
          },
          {
            key: "is_active",
            label: "Status",
            minWidth: 100,
            render: (value) => (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${value ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                {value ? "Active" : "Inactive"}
              </span>
            ),
          },
        ]}
        rows={(subcons ?? []) as unknown as Record<string, unknown>[]}
        rowHref={(row) => `/subcons/${(row as unknown as SubconRow).id}`}
        emptyState={<span className="text-jscolors-text/50">No subcons created yet.</span>}
      />
    </ListPageLayout>
  )
}
