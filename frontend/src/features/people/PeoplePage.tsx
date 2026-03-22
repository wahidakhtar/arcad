import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

import FieldRenderer from "../../components/ui/FieldRenderer"
import { getPageConfig } from "../../config"
import { useAuth } from "../../context/AuthContext"
import { useListPage } from "../../hooks/useListPage"
import { api } from "../../lib/api"

type RoleEntry = {
  department: string
  project: string
  access: string
}

type UserGroup = {
  user_id: number
  name: string
  active: boolean
  roles: RoleEntry[]
}

type ProjectEntry = {
  id: number
  key: string
  label: string
}

export default function PeoplePage() {
  const config = getPageConfig("people")
  const navigate = useNavigate()
  const { tags } = useAuth()
  const canWriteUser = tags.people?.write === true
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null)
  const [openAddUser, setOpenAddUser] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<Record<string, string | boolean>>({
    label: "",
    username: "",
    password: "",
    confirm_password: "",
  })
  const [badgeLabels, setBadgeLabels] = useState<{ department: Record<string, string>; level: Record<string, string> }>({
    department: {},
    level: {},
  })
  const [projectMap, setProjectMap] = useState<Record<number, string>>({})

  const { data, loading, error: loadError, refetch } = useListPage<
    Array<{ id: number; label: string; username: string; active: boolean; roles: Array<{ dept_key: string; level_key: string; project_id: number | null }> }>
  >({
    endpoint: "/users",
  })

  useEffect(() => {
    void Promise.all([
      api.get("/badges", { params: { type: "department" } }),
      api.get("/badges", { params: { type: "level" } }),
      api.get("/projects"),
    ]).then(([departmentsResponse, levelsResponse, projectsResponse]) => {
      setBadgeLabels({
        department: Object.fromEntries(departmentsResponse.data.map((badge: { key: string; label: string }) => [badge.key, badge.label])),
        level: Object.fromEntries(levelsResponse.data.map((badge: { key: string; label: string }) => [badge.key, badge.label])),
      })
      const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
      setProjectMap(Object.fromEntries(projects.map((p) => [p.id, p.label])))
    })
  }, [])

  const groups = useMemo<UserGroup[]>(() => {
    return (data ?? []).map((user) => {
      const roles = user.roles ?? []
      const roleEntries: RoleEntry[] = roles.length
        ? roles.map((role) => ({
            department: badgeLabels.department[role.dept_key] ?? role.dept_key,
            project: role.project_id != null ? (projectMap[role.project_id] ?? String(role.project_id)) : "Global",
            access: badgeLabels.level[role.level_key] ?? role.level_key,
          }))
        : [{ department: "-", project: "-", access: "-" }]
      return { user_id: user.id, name: user.label, active: user.active, roles: roleEntries }
    }).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return (a.roles[0]?.department ?? "").localeCompare(b.roles[0]?.department ?? "")
    })
  }, [badgeLabels.department, badgeLabels.level, projectMap, data])

  if (loading) return <div className="glass-panel p-6">Loading people...</div>
  if (loadError) return <div className="glass-panel p-6 text-red-700">{loadError}</div>

  return (
    <div className="space-y-6">
      {canWriteUser && openAddUser && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpenAddUser(false); setError("") } }}
        >
          <div
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
            className="glass-panel w-full max-w-md p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Add User</h2>
              <button type="button" onClick={() => { setOpenAddUser(false); setError("") }} className="premium-button-secondary">Close</button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (form.password !== form.confirm_password) {
                  setError("Passwords do not match.")
                  return
                }
                setSubmitting(true)
                setError("")
                void api
                  .post("/users", { label: form.label, username: form.username, password: form.password })
                  .then(() => {
                    setForm({ label: "", username: "", password: "", confirm_password: "" })
                    setOpenAddUser(false)
                    refetch()
                  })
                  .catch((requestError: { response?: { data?: { detail?: string } } }) => {
                    setError(requestError.response?.data?.detail ?? "Unable to create user.")
                  })
                  .finally(() => setSubmitting(false))
              }}
            >
              {config.addUserFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">{field.label}</span>
                  <FieldRenderer
                    mode="input"
                    field={field}
                    value={form[field.key] ?? ""}
                    onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                  />
                </label>
              ))}
              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              <button type="submit" className="premium-button w-full" disabled={submitting}>
                {submitting ? "Creating User..." : "Create User"}
              </button>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {canWriteUser && (
        <div className="flex justify-end">
          <button type="button" className="premium-button shrink-0" onClick={() => setOpenAddUser(true)}>
            Add User
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-[24px] border border-jscolors-crimson/10 bg-white">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03]">
              {["Name", "Department", "Project", "Access"].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.roles.map((role, roleIndex) => (
                <tr
                  key={`${group.user_id}-${roleIndex}`}
                  className={`cursor-pointer border-b border-jscolors-crimson/8 transition ${hoveredUserId === group.user_id ? "bg-jscolors-gold/10" : ""} ${!group.active ? "opacity-40" : ""}`}
                  onClick={() => navigate(`/people/${group.user_id}`)}
                  onMouseEnter={() => setHoveredUserId(group.user_id)}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  {roleIndex === 0 && (
                    <td rowSpan={group.roles.length} className="px-5 py-4 align-middle text-sm font-medium text-jscolors-text">
                      {group.name}
                    </td>
                  )}
                  {roleIndex === 0 && (
                    <td rowSpan={group.roles.length} className="px-5 py-4 align-middle text-sm text-jscolors-text">
                      {role.department}
                    </td>
                  )}
                  <td className="px-5 py-4 text-sm text-jscolors-text">{role.project}</td>
                  <td className="px-5 py-4 text-sm text-jscolors-text">{role.access}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}

