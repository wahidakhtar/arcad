import { useEffect, useMemo, useState } from "react"

import Button from "../../components/ui/Button"
import DataTable from "../../components/ui/DataTable"
import FieldRenderer from "../../components/ui/FieldRenderer"
import ListPageLayout from "../../components/layout/ListPageLayout"
import Modal from "../../components/ui/Modal"
import { getPageConfig } from "../../config"
import { useAuth } from "../../context/AuthContext"
import { useListPage } from "../../hooks/useListPage"
import { api } from "../../lib/api"

type ProjectEntry = {
  id: number
  key: string
  label: string
}

type UserRow = {
  user_id: number
  name: string
  active: boolean
  departments: string[]
  projects: string[]
  accesses: string[]
}

export default function PeoplePage() {
  const config = getPageConfig("people")
  const { can } = useAuth()
  const canWriteUser = can("people", "write")
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

  const userRows = useMemo<UserRow[]>(() => {
    const deptOrder = ["mgmt", "ops", "acc", "hr", "fo"]
    return (data ?? [])
      .slice()
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        const aKey = a.roles[0]?.dept_key ?? ""
        const bKey = b.roles[0]?.dept_key ?? ""
        return (deptOrder.indexOf(aKey) === -1 ? 999 : deptOrder.indexOf(aKey)) -
               (deptOrder.indexOf(bKey) === -1 ? 999 : deptOrder.indexOf(bKey))
      })
      .map((user) => {
        const roles = user.roles ?? []
        if (!roles.length) {
          return { user_id: user.id, name: user.label, active: user.active, departments: ["-"], projects: ["-"], accesses: ["-"] }
        }
        return {
          user_id: user.id,
          name: user.label,
          active: user.active,
          departments: roles.map((r) => badgeLabels.department[r.dept_key] ?? r.dept_key),
          projects: roles.map((r) => r.project_id != null ? (projectMap[r.project_id] ?? String(r.project_id)) : "Global"),
          accesses: roles.map((r) => badgeLabels.level[r.level_key] ?? r.level_key),
        }
      })
  }, [badgeLabels.department, badgeLabels.level, projectMap, data])

  async function handleAddUser() {
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await api.post("/users", { label: form.label, username: form.username, password: form.password })
      setForm({ label: "", username: "", password: "", confirm_password: "" })
      setOpenAddUser(false)
      refetch()
    } catch (requestError: unknown) {
      const detail = (requestError as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? "Unable to create user.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading people...</div>
  if (loadError) return <div className="p-6 text-red-600">{loadError}</div>

  return (
    <ListPageLayout
      actions={canWriteUser ? (
        <Button type="button" className="shrink-0" onClick={() => setOpenAddUser(true)}>
          Add User
        </Button>
      ) : undefined}
    >
      <Modal
        isOpen={canWriteUser && openAddUser}
        title="Add User"
        onClose={() => { setOpenAddUser(false); setError("") }}
        size="md"
        submitLabel="Create User"
        onSubmit={() => void handleAddUser()}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
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
        </div>
      </Modal>

      <DataTable
        columns={[
          { key: "name", label: "Name", minWidth: 160 },
          {
            key: "departments",
            label: "Department",
            minWidth: 140,
            render: (value) => (
              <div className="space-y-1">
                {(value as string[]).map((d, i) => <div key={i}>{d}</div>)}
              </div>
            ),
          },
          {
            key: "projects",
            label: "Project",
            minWidth: 160,
            render: (value) => (
              <div className="space-y-1">
                {(value as string[]).map((p, i) => <div key={i}>{p}</div>)}
              </div>
            ),
          },
          {
            key: "accesses",
            label: "Access",
            minWidth: 120,
            render: (value) => (
              <div className="space-y-1">
                {(value as string[]).map((a, i) => <div key={i}>{a}</div>)}
              </div>
            ),
          },
        ]}
        rows={userRows as unknown as Record<string, unknown>[]}
        rowHref={(row) => `/people/${(row as unknown as UserRow).user_id}`}
        getRowClassName={(row) => !(row as unknown as UserRow).active ? "opacity-40" : ""}
      />
    </ListPageLayout>
  )
}
