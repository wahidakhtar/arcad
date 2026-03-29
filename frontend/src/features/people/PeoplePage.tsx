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

type RoleEntry = {
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

  type FlatRow = { user_id: number; name: string; active: boolean; department: string; project: string; access: string }

  const flatRows = useMemo<FlatRow[]>(() => {
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
      .flatMap((user) => {
        const roles = user.roles ?? []
        const roleEntries: RoleEntry[] = roles.length
          ? roles.map((role) => ({
              department: badgeLabels.department[role.dept_key] ?? role.dept_key,
              project: role.project_id != null ? (projectMap[role.project_id] ?? String(role.project_id)) : "Global",
              access: badgeLabels.level[role.level_key] ?? role.level_key,
            }))
          : [{ department: "-", project: "-", access: "-" }]
        return roleEntries.map((role) => ({
          user_id: user.id,
          name: user.label,
          active: user.active,
          department: role.department,
          project: role.project,
          access: role.access,
        }))
      })
  }, [badgeLabels.department, badgeLabels.level, projectMap, data])

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
      <Modal open={canWriteUser && openAddUser} title="Add User" onClose={() => { setOpenAddUser(false); setError("") }} size="md">
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating User..." : "Create User"}
          </Button>
        </form>
      </Modal>

      <DataTable
        columns={[
          { key: "name", label: "Name", minWidth: 160, groupMerge: true },
          { key: "department", label: "Department", minWidth: 140, groupMerge: true },
          { key: "project", label: "Project", minWidth: 160 },
          { key: "access", label: "Access", minWidth: 120 },
        ]}
        rows={flatRows as unknown as Record<string, unknown>[]}
        groupBy="user_id"
        rowHref={(row) => `/people/${(row as unknown as FlatRow).user_id}`}
        getRowClassName={(row) => !(row as unknown as FlatRow).active ? "opacity-40" : ""}
      />
    </ListPageLayout>
  )
}
