import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { api } from "../../lib/api"

type UserDetail = {
  id: number
  username: string
  label: string
  aadhaar?: string | null
  upi?: string | null
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

export default function UserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([])
  const [projects, setProjects] = useState<Array<{ id: number; key: string; label: string }>>([])
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm_password: "" })
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: "", aadhaar: "", upi: "" })
  const [roleForm, setRoleForm] = useState({ dept_key: "", level_key: "", project_id: "" })

  useEffect(() => {
    if (!userId) return
    void Promise.all([
      api.get(`/users/${userId}`),
      api.get("/projects"),
    ]).then(([userResponse, projectsResponse]) => {
      const nextUser = userResponse.data as UserDetail
      setUser(nextUser)
      setForm({
        username: nextUser.username,
        aadhaar: nextUser.aadhaar ?? "",
        upi: nextUser.upi ?? "",
      })
      setProjects(projectsResponse.data)
    })
  }, [userId])

  // Reload available roles whenever user changes (role added/removed)
  useEffect(() => {
    if (!userId) return
    void api.get<AvailableRole[]>(`/roles/available?user_id=${userId}`).then((r) => {
      setAvailableRoles(r.data)
      // Reset form to first available dept
      const depts = [...new Set(r.data.map((x) => x.dept_key))]
      const firstDept = depts[0] ?? ""
      const firstLevel = r.data.find((x) => x.dept_key === firstDept)?.level_key ?? ""
      setRoleForm({ dept_key: firstDept, level_key: firstLevel, project_id: "" })
    }).catch(() => {})
  }, [userId, user?.roles.length])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

  // Derived from availableRoles
  const availableDepts = useMemo(() => [...new Set(availableRoles.map((r) => r.dept_key))], [availableRoles])
  const levelsForDept = useMemo(
    () => [...new Set(availableRoles.filter((r) => r.dept_key === roleForm.dept_key).map((r) => r.level_key))],
    [availableRoles, roleForm.dept_key],
  )
  const needsProject = ["ops", "fo"].includes(roleForm.dept_key)

  // When dept changes, reset level to first available
  function handleDeptChange(dept: string) {
    const firstLevel = availableRoles.find((r) => r.dept_key === dept)?.level_key ?? ""
    setRoleForm({ dept_key: dept, level_key: firstLevel, project_id: "" })
  }

  async function reloadUser() {
    if (!userId) return
    const response = await api.get(`/users/${userId}`)
    const nextUser = response.data as UserDetail
    setUser(nextUser)
    setForm({
      username: nextUser.username,
      aadhaar: nextUser.aadhaar ?? "",
      upi: nextUser.upi ?? "",
    })
  }

  if (!user) {
    return <div className="glass-panel p-6">User not found.</div>
  }

  // Label lookups from available roles (fallback to key)
  const deptLabelMap: Record<string, string> = {}
  const levelLabelMap: Record<string, string> = {}
  for (const r of availableRoles) {
    deptLabelMap[r.dept_key] = r.dept_key  // available roles don't carry dept label — use badge lookup below
    levelLabelMap[r.level_key] = r.level_key
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Identity</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{user.label}</h1>
        <div className="mt-6 space-y-4 text-sm">
          <EditableRow label="Username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} />
          <EditableRow label="Aadhaar" value={form.aadhaar} onChange={(value) => setForm((current) => ({ ...current, aadhaar: value }))} />
          <EditableRow label="UPI" value={form.upi} onChange={(value) => setForm((current) => ({ ...current, upi: value }))} />
          <div className="flex gap-3">
            <button
              type="button"
              className="premium-button"
              disabled={saving}
              onClick={() => {
                setSaving(true)
                void api
                  .patch(`/users/${user.id}`, form)
                  .then(() => reloadUser())
                  .finally(() => setSaving(false))
              }}
            >
              Save
            </button>
            <button type="button" className="premium-button-secondary" onClick={() => setChangePasswordOpen((current) => !current)}>
              Change Password
            </button>
            <button
              type="button"
              className="premium-button-secondary"
              onClick={() => {
                void api.patch(`/users/${user.id}`, { active: !user.active }).then(() => reloadUser())
              }}
            >
              {user.active ? "Deactivate" : "Activate"}
            </button>
          </div>
          {changePasswordOpen ? (
            <div className="rounded-[18px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={passwordForm.confirm_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                  className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                />
              </div>
              <button
                type="button"
                className="premium-button mt-3"
                onClick={() => {
                  if (!passwordForm.password || passwordForm.password !== passwordForm.confirm_password) return
                  void api.patch(`/users/${user.id}/password`, { password: passwordForm.password }).then(() => {
                    setPasswordForm({ password: "", confirm_password: "" })
                    setChangePasswordOpen(false)
                  })
                }}
              >
                Update Password
              </button>
            </div>
          ) : null}
        </div>
      </section>
      <section className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Assigned Roles</p>
        <div className="mt-5 space-y-3">
          {user.roles.length ? user.roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
              <div>
                <div className="font-medium text-jscolors-text">
                  {role.dept_key} · {role.level_key} · {projectById.get(role.project_id ?? -1)?.label ?? "Global"}
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-jscolors-text/45">
                  {projectById.get(role.project_id ?? -1)?.label ?? "Global"}
                </div>
              </div>
              <button
                type="button"
                className="premium-button-secondary"
                onClick={() => {
                  void api.delete(`/users/${user.id}/roles/${role.id}`).then(() => reloadUser())
                }}
              >
                Remove
              </button>
            </div>
          )) : <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4 text-sm text-jscolors-text/60">No roles assigned</div>}
        </div>

        {availableDepts.length > 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/65">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Department</span>
                <select
                  value={roleForm.dept_key}
                  onChange={(event) => handleDeptChange(event.target.value)}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  {availableDepts.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Project</span>
                {needsProject ? (
                  <select
                    value={roleForm.project_id}
                    onChange={(event) => setRoleForm((current) => ({ ...current, project_id: event.target.value }))}
                    className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">Global</div>
                )}
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Level</span>
                <select
                  value={roleForm.level_key}
                  onChange={(event) => setRoleForm((current) => ({ ...current, level_key: event.target.value }))}
                  className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
                >
                  {levelsForDept.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="premium-button mt-4"
              onClick={() => {
                void api.post(`/users/${user.id}/roles`, {
                  dept_key: roleForm.dept_key,
                  level_key: roleForm.level_key,
                  project_id: needsProject && roleForm.project_id ? Number(roleForm.project_id) : null,
                }).then(() => reloadUser())
              }}
            >
              Assign
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/60">
            No additional roles can be assigned.
          </div>
        )}
      </section>
    </div>
  )
}

function EditableRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-[18px] border border-jscolors-crimson/10 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-sm outline-none"
      />
    </div>
  )
}
