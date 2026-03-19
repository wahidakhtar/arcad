import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import FieldRenderer from "../../components/ui/FieldRenderer"
import Modal from "../../components/ui/Modal"
import DataTable from "../../components/ui/DataTable"
import { getPageConfig } from "../../config"
import { useListPage } from "../../hooks/useListPage"
import { api } from "../../lib/api"

type FlatRoleRow = {
  user_id: number
  name: string
  active: boolean
  department: string
  project: string
  access: string
}

type ProjectEntry = {
  id: number
  key: string
  label: string
}

export default function PeoplePage() {
  const config = getPageConfig("people")
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

  const rows = useMemo<FlatRoleRow[]>(() => {
    const result: FlatRoleRow[] = []
    for (const user of data ?? []) {
      const roles = user.roles ?? []
      if (!roles.length) {
        result.push({ user_id: user.id, name: user.label, active: user.active, department: "-", project: "-", access: "-" })
        continue
      }
      roles.forEach((role, index) => {
        result.push({
          user_id: user.id,
          name: index === 0 ? user.label : "",
          active: user.active,
          department: badgeLabels.department[role.dept_key] ?? role.dept_key,
          project: role.project_id != null ? (projectMap[role.project_id] ?? String(role.project_id)) : "Global",
          access: badgeLabels.level[role.level_key] ?? role.level_key,
        })
      })
    }
    return result
  }, [badgeLabels.department, badgeLabels.level, projectMap, data])

  if (loading) {
    return <div className="glass-panel p-6">Loading people...</div>
  }

  if (loadError) {
    return <div className="glass-panel p-6 text-red-700">{loadError}</div>
  }

  return (
    <div className="space-y-6">
      <Header
        eyebrow="People"
        title="Users, departments, and access layers"
        summary="Create users here, then open any row for role visibility and identity details."
      >
        <button type="button" className="premium-button-secondary" onClick={() => setOpenAddUser(true)}>
          + Add User
        </button>
      </Header>
      <Modal open={openAddUser} title="Add User" onClose={() => setOpenAddUser(false)}>
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
      </Modal>
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "department", label: "Department" },
          { key: "project", label: "Project" },
          { key: "access", label: "Access" },
        ]}
        rows={rows as unknown as Record<string, unknown>[]}
        rowHref={(row) => `/people/${(row as unknown as FlatRoleRow).user_id}`}
        getRowClassName={(row) => {
          const r = row as unknown as FlatRoleRow
          return [!r.active ? "opacity-40" : "", r.name ? "" : "border-t-0"].filter(Boolean).join(" ")
        }}
      />
      <Link to="/dashboard" className="premium-button-secondary">
        Back to Dashboard
      </Link>
    </div>
  )
}

function Header({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">{eyebrow}</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{title}</h1>
      </div>
      <div className="flex flex-col items-start gap-3 lg:items-end">
        <p className="max-w-xl text-sm leading-7 text-jscolors-text/60 lg:text-right">{summary}</p>
        {children}
      </div>
    </div>
  )
}
