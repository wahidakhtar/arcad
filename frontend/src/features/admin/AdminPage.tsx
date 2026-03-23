import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

// ─── API Types ───────────────────────────────────────────────────────────────

type Badge = { id: number; type: string; key: string; label: string; color: string | null }
type TransitionType = { id: number; key: string; label: string }
type BadgeTransition = {
  id: number
  project: string
  type_id: number
  from_id: number
  from_key: string
  from_label: string
  to_id: number
  to_key: string
  to_label: string
}
type BadgeTransitionsResponse = {
  mi: BadgeTransition[]
  md: BadgeTransition[]
  ma: BadgeTransition[]
  mc: BadgeTransition[]
  transition_types: TransitionType[]
  badges: Badge[]
}
type UIField = {
  id: number
  tag: string
  label: string
  type: string
  list_view: boolean
  form_view: boolean
  bulk_view: boolean
  section: string
  perm_tag: string | null
  order: number | null
}
type UIFieldsResponse = Record<string, UIField[]>
type Job = { id: number; job_key: string; bucket_key: string; label: string; scale_by: string; bucket_label: string }
type RoleEntry = { id: number; key: string; label: string; dept_key: string; level_key: string }
type TagEntry = { id: number; tag: string; description: string }
type RoleTagsResponse = {
  roles: RoleEntry[]
  tags: TagEntry[]
  matrix: Record<string, { read: boolean; write: boolean }>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ["Badges", "Badge Transitions", "UI Fields", "Jobs", "Tags & Roles"] as const
type Tab = (typeof TABS)[number]

const PERM_TAG_OPTIONS = ["", "billing", "doc_badge", "site:write"]
const SCALE_BY_OPTIONS = ["height", "height_if_true", "numeric", "visit_date", "unit"]

// ─── Shared table styling helpers ────────────────────────────────────────────

const tableWrapCls = "overflow-x-auto rounded-[24px] border border-jscolors-crimson/10 bg-white"
const tableCls = "min-w-full border-collapse table-fixed"
const theadRowCls = "border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03]"
const thCls = "px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50"
const tbodyRowCls = "border-b border-jscolors-crimson/8"
const tdCls = "px-5 py-4 text-sm text-jscolors-text"
const inputCls =
  "w-full rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"

// ─── BadgesTab ────────────────────────────────────────────────────────────────

function BadgesTab() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [badges, setBadges] = useState<Badge[]>([])
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    void api
      .get<Badge[]>("/admin/badges")
      .then((res) => setBadges(res.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load badges"),
      )
  }, [])

  function updateBadge(id: number, patch: Partial<Badge>) {
    setBadges((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    setDirty((prev) => new Set(prev).add(id))
  }

  function handleSave(id: number) {
    const badge = badges.find((b) => b.id === id)
    if (!badge) return
    setSaving((prev) => new Set(prev).add(id))
    void api
      .patch(`/admin/badges/${id}`, { label: badge.label, color: badge.color })
      .then(() => {
        setDirty((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to save badge"),
      )
      .finally(() => {
        setSaving((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr className={theadRowCls}>
              <th className={thCls}>ID</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Key</th>
              <th className={thCls}>Label</th>
              <th className={thCls}>Color</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {badges.map((badge) => (
              <tr key={badge.id} className={tbodyRowCls}>
                <td className={tdCls}>{badge.id}</td>
                <td className={tdCls}>{badge.type}</td>
                <td className={tdCls}>{badge.key}</td>
                <td className={tdCls}>
                  <input
                    type="text"
                    value={badge.label}
                    onChange={(e) => updateBadge(badge.id, { label: e.target.value })}
                    className={inputCls}
                  />
                </td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badge.color ?? "#cccccc"}
                      onChange={(e) => updateBadge(badge.id, { color: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <input
                      type="text"
                      value={badge.color ?? ""}
                      onChange={(e) => updateBadge(badge.id, { color: e.target.value })}
                      className="w-24 rounded-xl border border-jscolors-crimson/15 px-2 py-1 text-sm outline-none focus:border-jscolors-crimson/40"
                      placeholder="#rrggbb"
                    />
                  </div>
                </td>
                <td className={tdCls}>
                  {canWrite && dirty.has(badge.id) && (
                    <button
                      className="premium-button py-1.5 px-3 text-xs"
                      onClick={() => handleSave(badge.id)}
                      disabled={saving.has(badge.id)}
                    >
                      {saving.has(badge.id) ? "Saving…" : "Save"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {badges.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No badges configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BadgeTransitionsTab ──────────────────────────────────────────────────────

const PROJECTS = ["mi", "md", "ma", "mc"] as const
type ProjectKey = (typeof PROJECTS)[number]

function BadgeTransitionsTab() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [data, setData] = useState<BadgeTransitionsResponse | null>(null)
  const [newRow, setNewRow] = useState({ project: "mi", type_id: "", from_id: "", to_id: "" })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  function fetchData() {
    void api
      .get<BadgeTransitionsResponse>("/admin/badge-transitions")
      .then((res) => setData(res.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load badge transitions"),
      )
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleRemove(project: string, id: number) {
    // Optimistically remove from local state
    if (data) {
      const key = project as ProjectKey
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, [key]: prev[key].filter((t) => t.id !== id) }
      })
    }
    void api
      .delete(`/admin/badge-transitions/${project}/${id}`)
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setError(err.response?.data?.detail ?? "Failed to remove transition")
        fetchData()
      })
  }

  function handleAdd() {
    if (!newRow.type_id || !newRow.from_id || !newRow.to_id) {
      setError("All fields are required.")
      return
    }
    setAdding(true)
    setError("")
    void api
      .post("/admin/badge-transitions", {
        project: newRow.project,
        type_id: Number(newRow.type_id),
        from_id: Number(newRow.from_id),
        to_id: Number(newRow.to_id),
      })
      .then(() => {
        setNewRow({ project: "mi", type_id: "", from_id: "", to_id: "" })
        fetchData()
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to add transition"),
      )
      .finally(() => setAdding(false))
  }

  const selectCls =
    "rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {PROJECTS.map((proj) => {
        const transitions = data ? data[proj] : []
        return (
          <div key={proj} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">
              {proj.toUpperCase()}
            </h3>
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr className={theadRowCls}>
                    <th className={thCls}>From</th>
                    <th className={thCls}>To</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {transitions.map((t) => {
                    const typLabel = data?.transition_types.find((tt) => tt.id === t.type_id)?.label ?? String(t.type_id)
                    return (
                      <tr key={t.id} className={tbodyRowCls}>
                        <td className={tdCls}>{t.from_label}</td>
                        <td className={tdCls}>{t.to_label}</td>
                        <td className={tdCls}>{typLabel}</td>
                        <td className={tdCls}>
                          {canWrite && (
                            <button
                              className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                              onClick={() => handleRemove(proj, t.id)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {transitions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-4 text-center text-sm text-jscolors-text/50">
                        No transitions for {proj.toUpperCase()}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Add form */}
      {canWrite && <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">
          Add Transition
        </h3>
        <div className="flex gap-3 items-end flex-wrap mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Project</span>
            <select
              value={newRow.project}
              onChange={(e) => setNewRow((r) => ({ ...r, project: e.target.value }))}
              className={selectCls}
            >
              {PROJECTS.map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Type</span>
            <select
              value={newRow.type_id}
              onChange={(e) => setNewRow((r) => ({ ...r, type_id: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select type</option>
              {(data?.transition_types ?? []).map((tt) => (
                <option key={tt.id} value={tt.id}>{tt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">From</span>
            <select
              value={newRow.from_id}
              onChange={(e) => setNewRow((r) => ({ ...r, from_id: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select badge</option>
              {(data?.badges ?? [])
                .filter((b) => b.type !== "dept" && b.type !== "level")
                .map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">To</span>
            <select
              value={newRow.to_id}
              onChange={(e) => setNewRow((r) => ({ ...r, to_id: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select badge</option>
              {(data?.badges ?? [])
                .filter((b) => b.type !== "dept" && b.type !== "level")
                .map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
            </select>
          </div>
          <button
            className="premium-button py-1.5 px-4 text-sm"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>}
    </div>
  )
}

// ─── UIFieldsTab ──────────────────────────────────────────────────────────────

function UIFieldsTab() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [fields, setFields] = useState<Record<string, UIField[]>>({})
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")
  const dragRef = useRef<number>(-1)
  const dropRef = useRef<number>(-1)

  useEffect(() => {
    void api
      .get<UIFieldsResponse>("/admin/ui-fields")
      .then((res) => setFields(res.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load UI fields"),
      )
  }, [])

  function updateField(project: string, id: number, patch: Partial<UIField>) {
    setFields((prev) => ({
      ...prev,
      [project]: prev[project].map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
    setDirty((prev) => new Set(prev).add(id))
  }

  function handleSave(project: string, id: number) {
    const field = fields[project]?.find((f) => f.id === id)
    if (!field) return
    setSaving((prev) => new Set(prev).add(id))
    void api
      .patch(`/admin/ui-fields/${project}/${id}`, {
        label: field.label,
        list_view: field.list_view,
        form_view: field.form_view,
        bulk_view: field.bulk_view,
        section: field.section,
        perm_tag: field.perm_tag,
      })
      .then(() => {
        setDirty((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to save field"),
      )
      .finally(() => {
        setSaving((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
  }

  function handleReorder(project: string) {
    const from = dragRef.current
    const to = dropRef.current
    if (from === -1 || to === -1 || from === to) return
    setFields((prev) => {
      const list = [...prev[project]]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { ...prev, [project]: list }
    })
    // Post reorder after state update — use current fields snapshot + splice
    setFields((prev) => {
      const ids = prev[project].map((f) => f.id)
      void api
        .post(`/admin/ui-fields/${project}/reorder`, { ids })
        .catch((err: { response?: { data?: { detail?: string } } }) =>
          setError(err.response?.data?.detail ?? "Failed to reorder fields"),
        )
      return prev
    })
    dragRef.current = -1
    dropRef.current = -1
  }

  const projectKeys = Object.keys(fields)

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {projectKeys.map((project) => (
        <div key={project} className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">
            {project.toUpperCase()}
          </h3>
          <div className={tableWrapCls}>
            <table className={tableCls}>
              <thead>
                <tr className={theadRowCls}>
                  <th className="px-3 py-3 w-8"></th>
                  <th className={thCls}>Label</th>
                  <th className={thCls}>List</th>
                  <th className={thCls}>Form</th>
                  <th className={thCls}>Bulk</th>
                  <th className={thCls}>Section</th>
                  <th className={thCls}>Perm Tag</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {(fields[project] ?? []).map((field, index) => (
                  <tr
                    key={field.id}
                    className={tbodyRowCls}
                    draggable="true"
                    onDragStart={(e) => {
                      dragRef.current = index
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      dropRef.current = index
                    }}
                    onDrop={() => handleReorder(project)}
                  >
                    <td className="px-3 py-4 text-jscolors-text/30 cursor-grab text-base select-none">≡</td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(project, field.id, { label: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="checkbox"
                        checked={field.list_view}
                        onChange={(e) => updateField(project, field.id, { list_view: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="checkbox"
                        checked={field.form_view}
                        onChange={(e) => updateField(project, field.id, { form_view: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="checkbox"
                        checked={field.bulk_view}
                        onChange={(e) => updateField(project, field.id, { bulk_view: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        value={field.section}
                        onChange={(e) => updateField(project, field.id, { section: e.target.value })}
                        className="w-28 rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"
                      />
                    </td>
                    <td className={tdCls}>
                      <select
                        value={field.perm_tag ?? ""}
                        onChange={(e) =>
                          updateField(project, field.id, { perm_tag: e.target.value === "" ? null : e.target.value })
                        }
                        className="rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"
                      >
                        {PERM_TAG_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt === "" ? "—" : opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tdCls}>
                      {canWrite && dirty.has(field.id) && (
                        <button
                          className="premium-button py-1.5 px-3 text-xs"
                          onClick={() => handleSave(project, field.id)}
                          disabled={saving.has(field.id)}
                        >
                          {saving.has(field.id) ? "Saving…" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(fields[project] ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-4 text-center text-sm text-jscolors-text/50">
                      No fields for {project.toUpperCase()}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── JobsTab ──────────────────────────────────────────────────────────────────

function JobsTab() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [jobs, setJobs] = useState<Job[]>([])
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    void api
      .get<Job[]>("/admin/jobs")
      .then((res) => setJobs(res.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load jobs"),
      )
  }, [])

  function updateJob(id: number, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
    setDirty((prev) => new Set(prev).add(id))
  }

  function handleSave(id: number) {
    const job = jobs.find((j) => j.id === id)
    if (!job) return
    setSaving((prev) => new Set(prev).add(id))
    void api
      .patch(`/admin/jobs/${id}`, { label: job.label, scale_by: job.scale_by })
      .then(() => {
        setDirty((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to save job"),
      )
      .finally(() => {
        setSaving((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr className={theadRowCls}>
              <th className={thCls}>Job Key</th>
              <th className={thCls}>Bucket</th>
              <th className={thCls}>Label</th>
              <th className={thCls}>Scale By</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className={tbodyRowCls}>
                <td className={tdCls}>{job.job_key}</td>
                <td className={tdCls}>{job.bucket_label}</td>
                <td className={tdCls}>
                  <input
                    type="text"
                    value={job.label}
                    onChange={(e) => updateJob(job.id, { label: e.target.value })}
                    className={inputCls}
                  />
                </td>
                <td className={tdCls}>
                  <select
                    value={job.scale_by}
                    onChange={(e) => updateJob(job.id, { scale_by: e.target.value })}
                    className="rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"
                  >
                    {SCALE_BY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className={tdCls}>
                  {canWrite && dirty.has(job.id) && (
                    <button
                      className="premium-button py-1.5 px-3 text-xs"
                      onClick={() => handleSave(job.id)}
                      disabled={saving.has(job.id)}
                    >
                      {saving.has(job.id) ? "Saving…" : "Save"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No jobs configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-jscolors-text/50">
        Rates are managed on the{" "}
        <Link to="/billing/rate-card" className="text-jscolors-crimson underline underline-offset-2">
          Rate Card page
        </Link>
        .
      </div>
    </div>
  )
}

// ─── RoleTagsTab ──────────────────────────────────────────────────────────────

function RoleTagsTab() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [data, setData] = useState<RoleTagsResponse | null>(null)
  const [matrix, setMatrix] = useState<Record<string, { read: boolean; write: boolean }>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    void api
      .get<RoleTagsResponse>("/admin/role-tags")
      .then((res) => {
        setData(res.data)
        setMatrix(res.data.matrix)
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load role tags"),
      )
  }, [])

  function handleToggle(roleId: number, tagId: number, field: "read" | "write", value: boolean) {
    const key = `${roleId}:${tagId}`
    const prev = matrix[key] ?? { read: false, write: false }
    const updated = { ...prev, [field]: value }

    // Immediately update local state
    setMatrix((m) => ({ ...m, [key]: updated }))
    setSaving((s) => new Set(s).add(key))

    void api
      .patch("/admin/role-tags", { role_id: roleId, tag_id: tagId, read: updated.read, write: updated.write })
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setError(err.response?.data?.detail ?? "Failed to save permission")
        // Revert on error
        setMatrix((m) => ({ ...m, [key]: prev }))
      })
      .finally(() => {
        setSaving((s) => {
          const next = new Set(s)
          next.delete(key)
          return next
        })
      })
  }

  const roles = data?.roles ?? []
  const tags = data?.tags ?? []

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className={theadRowCls}>
              <th
                className={thCls}
                style={{ minWidth: 140 }}
              >
                Role
              </th>
              {tags.map((tag) => (
                <th
                  key={tag.id}
                  className={thCls}
                  style={{ minWidth: 80, textAlign: "center" }}
                >
                  {tag.tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className={tbodyRowCls}>
                <td className={tdCls} style={{ minWidth: 140 }}>
                  {role.label}
                </td>
                {tags.map((tag) => {
                  const key = `${role.id}:${tag.id}`
                  const perm = matrix[key] ?? { read: false, write: false }
                  return (
                    <td key={tag.id} className={tdCls} style={{ minWidth: 80, textAlign: "center" }}>
                      <div className="flex flex-col gap-1 items-center">
                        <label className="flex items-center gap-1 text-xs text-jscolors-text/60">
                          <input
                            type="checkbox"
                            checked={perm.read}
                            onChange={() => handleToggle(role.id, tag.id, "read", !perm.read)}
                            className="h-3 w-3"
                            disabled={!canWrite || saving.has(key)}
                          />
                          R
                        </label>
                        <label className="flex items-center gap-1 text-xs text-jscolors-text/60">
                          <input
                            type="checkbox"
                            checked={perm.write}
                            onChange={() => handleToggle(role.id, tag.id, "write", !perm.write)}
                            className="h-3 w-3"
                            disabled={!canWrite || saving.has(key)}
                          />
                          W
                        </label>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={tags.length + 1} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No roles configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { can } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("Badges")

  if (!can("admin", "read")) return <div className="p-6 text-red-600">Access denied.</div>

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="glass-panel p-4 flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
              activeTab === tab
                ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
                : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-panel p-6">
        {activeTab === "Badges" && <BadgesTab />}
        {activeTab === "Badge Transitions" && <BadgeTransitionsTab />}
        {activeTab === "UI Fields" && <UIFieldsTab />}
        {activeTab === "Jobs" && <JobsTab />}
        {activeTab === "Tags & Roles" && <RoleTagsTab />}
      </div>
    </div>
  )
}
