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

export default function UserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [projects, setProjects] = useState<Array<{ id: number; key: string; label: string; recurring?: boolean }>>([])
  const [departments, setDepartments] = useState<Array<{ key: string; label: string }>>([])
  const [levels, setLevels] = useState<Array<{ key: string; label: string }>>([])
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm_password: "" })
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: "", aadhaar: "", upi: "" })
  const [roleForm, setRoleForm] = useState({ dept_key: "mgmt", level_key: "l1", project_id: "" })

  useEffect(() => {
    if (!userId) return
    void Promise.all([
      api.get(`/users/${userId}`),
      api.get("/projects"),
      api.get("/badges", { params: { type: "department" } }),
      api.get("/badges", { params: { type: "level" } }),
    ]).then(([userResponse, projectsResponse, departmentsResponse, levelsResponse]) => {
      const nextUser = userResponse.data as UserDetail
      setUser(nextUser)
      setForm({
        username: nextUser.username,
        aadhaar: nextUser.aadhaar ?? "",
        upi: nextUser.upi ?? "",
      })
      setProjects(projectsResponse.data)
      setDepartments(departmentsResponse.data)
      setLevels(levelsResponse.data)
    })
  }, [userId])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const departmentLabelByKey = useMemo(() => Object.fromEntries(departments.map((item) => [item.key, item.label])), [departments])
  const levelLabelByKey = useMemo(() => Object.fromEntries(levels.map((item) => [item.key, item.label])), [levels])

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
                  {departmentLabelByKey[role.dept_key] ?? role.dept_key} · {levelLabelByKey[role.level_key] ?? role.level_key} · {projectById.get(role.project_id ?? -1)?.label ?? "Global"}
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
        <div className="mt-6 rounded-[24px] border border-dashed border-jscolors-crimson/20 bg-jscolors-crimson/[0.03] p-5 text-sm text-jscolors-text/65">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Department</span>
              <select
                value={roleForm.dept_key}
                onChange={(event) => setRoleForm((current) => ({ ...current, dept_key: event.target.value, project_id: "" }))}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
              >
                {departments.map((department) => (
                  <option key={department.key} value={department.key}>{department.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Project</span>
              {["ops", "fo"].includes(roleForm.dept_key) ? (
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
                {levels.map((level) => (
                  <option key={level.key} value={level.key}>{level.label}</option>
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
                project_id: ["ops", "fo"].includes(roleForm.dept_key) && roleForm.project_id ? Number(roleForm.project_id) : null,
              }).then(() => reloadUser())
            }}
          >
            Assign
          </button>
        </div>
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
