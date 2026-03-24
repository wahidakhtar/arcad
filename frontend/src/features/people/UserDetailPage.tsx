import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import DetailPageLayout from "../../components/layout/DetailPageLayout"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import Modal from "../../components/ui/Modal"

type UserDetail = {
  id: number
  username: string
  label: string
  aadhaar?: string | null
  upi?: string | null
  ctc?: string | null
  active: boolean
  roles: Array<{ id: number; label: string; key: string; dept_key: string; level_key: string; project_id: number | null }>
}

type AvailableRole = {
  role_id: number
  dept_key: string
  level_key: string
  label: string
  project_id: number | null
  project_label: string | null
  project_key: string | null
}

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none focus:border-jscolors-crimson/40"
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45"

export default function UserDetailPage() {
  const { userId } = useParams()
  const { can } = useAuth()
  const canWriteUser = can("people", "write")
  const canReadAssignRole = can("role", "read")
  const canWriteAssignRole = can("role", "write")

  const [user, setUser] = useState<UserDetail | null>(null)
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([])
  const [projects, setProjects] = useState<Array<{ id: number; key: string; label: string }>>([])
  const [deptLabels, setDeptLabels] = useState<Record<string, string>>({})
  const [levelLabels, setLevelLabels] = useState<Record<string, string>>({})

  // Edit Details modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ label: "", username: "", aadhaar: "", upi: "", ctc: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // Change Password modal
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ password: "", confirm_password: "" })
  const [pwError, setPwError] = useState("")

  // Assign Role modal
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleForm, setRoleForm] = useState({ dept_key: "", level_key: "", project_id: "" })

  useEffect(() => {
    if (!userId) return
    void Promise.all([
      api.get(`/users/${userId}`),
      api.get("/projects"),
      api.get("/badges", { params: { type: "department" } }),
      api.get("/badges", { params: { type: "level" } }),
    ]).then(([userResponse, projectsResponse, deptResponse, levelResponse]) => {
      const nextUser = userResponse.data as UserDetail
      setUser(nextUser)
      setProjects(projectsResponse.data)
      setDeptLabels(Object.fromEntries((deptResponse.data as { key: string; label: string }[]).map((b) => [b.key, b.label])))
      setLevelLabels(Object.fromEntries((levelResponse.data as { key: string; label: string }[]).map((b) => [b.key, b.label])))
    })
  }, [userId])

  useEffect(() => {
    if (!userId || !canReadAssignRole) return
    void api.get<AvailableRole[]>(`/roles/available?user_id=${userId}`).then((r) => {
      setAvailableRoles(r.data)
    }).catch(() => {})
  }, [userId, user?.roles.length, canReadAssignRole])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const availableDepts = useMemo(() => [...new Set(availableRoles.map((r) => r.dept_key))], [availableRoles])

  const needsProject = ["ops", "fo"].includes(roleForm.dept_key)

  const levelsForDept = useMemo(() => {
    let filtered = availableRoles.filter((r) => r.dept_key === roleForm.dept_key)
    if (needsProject && roleForm.project_id) {
      filtered = filtered.filter((r) => String(r.project_id) === roleForm.project_id)
    }
    return [...new Set(filtered.map((r) => r.level_key))]
  }, [availableRoles, roleForm.dept_key, roleForm.project_id, needsProject])

  async function reloadUser() {
    if (!userId) return
    const response = await api.get(`/users/${userId}`)
    setUser(response.data as UserDetail)
  }

  function openEdit() {
    if (!user) return
    setEditForm({
      label: user.label,
      username: user.username,
      aadhaar: user.aadhaar ?? "",
      upi: user.upi ?? "",
      ctc: user.ctc ?? "",
    })
    setEditError("")
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!user) return
    setEditSaving(true)
    setEditError("")
    try {
      await api.patch(`/users/${user.id}`, editForm)
      await reloadUser()
      setEditOpen(false)
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Save failed.")
    } finally {
      setEditSaving(false)
    }
  }

  async function savePassword() {
    if (!user) return
    if (!pwForm.password || pwForm.password !== pwForm.confirm_password) {
      setPwError("Passwords do not match.")
      return
    }
    setPwError("")
    try {
      await api.patch(`/users/${user.id}/password`, { password: pwForm.password })
      setPwForm({ password: "", confirm_password: "" })
      setPwOpen(false)
    } catch (err: unknown) {
      setPwError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to update password.")
    }
  }

  function openAssignRole() {
    const firstDept = availableDepts[0] ?? ""
    const firstLevel = availableRoles.find((r) => r.dept_key === firstDept)?.level_key ?? ""
    setRoleForm({ dept_key: firstDept, level_key: firstLevel, project_id: "" })
    setRoleModalOpen(true)
  }

  function handleRoleDeptChange(dept: string) {
    const firstLevel = availableRoles.find((r) => r.dept_key === dept)?.level_key ?? ""
    setRoleForm({ dept_key: dept, level_key: firstLevel, project_id: "" })
  }

  async function handleAssignRole() {
    if (!user) return
    await api.post(`/users/${user.id}/roles`, {
      dept_key: roleForm.dept_key,
      level_key: roleForm.level_key,
      project_id: needsProject && roleForm.project_id ? Number(roleForm.project_id) : null,
    })
    await reloadUser()
    setRoleModalOpen(false)
  }

  if (!user) {
    return <div className="p-6 text-jscolors-text/50">User not found.</div>
  }

  return (
    <DetailPageLayout backHref="/people">
      {/* Edit Details modal */}
      <Modal open={editOpen} title="Edit Details" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input type="text" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Aadhaar</label>
            <input type="text" value={editForm.aadhaar} onChange={(e) => setEditForm((f) => ({ ...f, aadhaar: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>UPI</label>
            <input type="text" value={editForm.upi} onChange={(e) => setEditForm((f) => ({ ...f, upi: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>CTC</label>
            <input type="text" value={editForm.ctc} onChange={(e) => setEditForm((f) => ({ ...f, ctc: e.target.value }))} className={fieldCls} />
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <Button type="button" className="w-full" disabled={editSaving} onClick={() => void saveEdit()}>
            {editSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      {/* Change Password modal */}
      <Modal open={pwOpen} title="Change Password" onClose={() => setPwOpen(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" value={pwForm.password} onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))} className={fieldCls} />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          <Button type="button" className="w-full" onClick={() => void savePassword()}>
            Update Password
          </Button>
        </div>
      </Modal>

      {/* Assign Role modal */}
      <Modal open={roleModalOpen} title="Assign Role" onClose={() => setRoleModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Department</label>
            <select
              value={roleForm.dept_key}
              onChange={(e) => handleRoleDeptChange(e.target.value)}
              className={fieldCls}
            >
              {availableDepts.map((dept) => (
                <option key={dept} value={dept}>{deptLabels[dept] ?? dept}</option>
              ))}
            </select>
          </div>
          {needsProject && (
            <div>
              <label className={labelCls}>Project</label>
              <select
                value={roleForm.project_id}
                onChange={(e) => {
                  const pid = e.target.value
                  const firstLevel = availableRoles.find(
                    (r) => r.dept_key === roleForm.dept_key && String(r.project_id) === pid,
                  )?.level_key ?? ""
                  setRoleForm((f) => ({ ...f, project_id: pid, level_key: firstLevel }))
                }}
                className={fieldCls}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Level</label>
            <select
              value={roleForm.level_key}
              onChange={(e) => setRoleForm((f) => ({ ...f, level_key: e.target.value }))}
              className={fieldCls}
            >
              {levelsForDept.map((level) => (
                <option key={level} value={level}>{levelLabels[level] ?? level}</option>
              ))}
            </select>
          </div>
          <Button type="button" className="w-full" onClick={() => void handleAssignRole()}>
            Assign
          </Button>
        </div>
      </Modal>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Identity</p>
            <div className="flex gap-2">
              {canWriteUser ? (
                <Button type="button" variant="secondary" size="sm" className="py-1 px-3" onClick={openEdit}>
                  Edit
                </Button>
              ) : null}
              {canWriteUser ? (
                <Button type="button" variant="secondary" size="sm" className="py-1 px-3" onClick={() => { setPwOpen(true); setPwError("") }}>
                  Password
                </Button>
              ) : null}
              {canWriteUser ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="py-1 px-3"
                  onClick={() => { void api.patch(`/users/${user.id}`, { active: !user.active }).then(() => reloadUser()) }}
                >
                  {user.active ? "Deactivate" : "Activate"}
                </Button>
              ) : null}
            </div>
          </div>
          <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{user.label}</h1>
          <div className="mt-6 space-y-3 text-sm">
            {[
              { label: "Username", value: user.username },
              { label: "Aadhaar", value: user.aadhaar ?? "" },
              { label: "UPI", value: user.upi ?? "" },
              { label: "CTC", value: user.ctc ?? "" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[18px] border border-jscolors-crimson/10 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{label}</div>
                <div className="mt-1 text-sm text-jscolors-text">{value || "—"}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Assigned Roles</p>
            {canWriteAssignRole && availableDepts.length > 0 ? (
              <Button type="button" variant="secondary" size="sm" className="py-1 px-3" onClick={openAssignRole}>
                Assign Role
              </Button>
            ) : null}
          </div>
          <div className="mt-5 space-y-3">
            {user.roles.length ? user.roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
                <div>
                  <div className="font-medium text-jscolors-text">
                    {deptLabels[role.dept_key] ?? role.dept_key} · {levelLabels[role.level_key] ?? role.level_key}
                  </div>
                  <div className="text-xs uppercase tracking-[0.22em] text-jscolors-text/45">
                    {projectById.get(role.project_id ?? -1)?.label ?? "Global"}
                  </div>
                </div>
                {canWriteAssignRole ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { void api.delete(`/users/${user.id}/roles/${role.id}`).then(() => reloadUser()) }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            )) : (
              <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4 text-sm text-jscolors-text/60">
                No roles assigned
              </div>
            )}
          </div>
          {canReadAssignRole && !canWriteAssignRole ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/60">
              Role assignment is read-only for your account.
            </div>
          ) : null}
        </section>
      </div>
    </DetailPageLayout>
  )
}
