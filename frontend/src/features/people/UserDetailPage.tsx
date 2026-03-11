import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../lib/api"

export default function UserDetailPage(){

  const { userId } = useParams()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [roles, setRoles] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  const [selectedDept, setSelectedDept] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedProject, setSelectedProject] = useState<number | "">("")

  useEffect(() => {
    loadUser()
    loadRoles()
    loadProjects()
  }, [userId])

  const loadUser = async () => {
    const res = await api.get(`/users/${userId}`)
    setUser(res.data)
    setLoading(false)
  }

  const loadRoles = async () => {
    const res = await api.get("/users/roles")
    setRoles(res.data)
  }

  const loadProjects = async () => {
    const res = await api.get("/project")
    setProjects(res.data)
  }

  const assignRole = async () => {

    if(!selectedDept || !selectedLevel) return

    const role = roles.find(
      r => r.department === selectedDept && r.level === selectedLevel
    )

    if(!role) return

    await api.post(`/users/${userId}/roles`, {
      role_id: role.id,
      project_badge_id: selectedProject || null
    })

    setSelectedDept("")
    setSelectedLevel("")
    setSelectedProject("")

    loadUser()
  }

  const removeRole = async (r:any) => {

    await api.delete(`/users/${userId}/roles/${r.role_id}`, {
      params: { project_badge_id: r.project_badge_id }
    })

    loadUser()
  }

  if(loading) return <div>Loading...</div>
  if(!user) return <div>User not found</div>

  const departments = [...new Set(roles.map(r => r.department))]

  const levels = roles
    .filter(r => r.department === selectedDept)
    .map(r => r.level)

  const projectEnabled = ["Operations","Field Operations"].includes(selectedDept)

  return (
    <div>

      <h2>{user.name}</h2>

      <div style={{ marginTop: 20 }}>
        <div><b>Username:</b> {user.username}</div>
        <div><b>Active:</b> {user.is_active ? "Yes" : "No"}</div>
      </div>

      <h3 style={{ marginTop: 30 }}>Roles</h3>

      <table style={{ marginTop: 10, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: 6, textAlign: "left" }}>Department</th>
            <th style={{ padding: 6, textAlign: "left" }}>Level</th>
            <th style={{ padding: 6, textAlign: "left" }}>Project</th>
            <th style={{ padding: 6 }}></th>
          </tr>
        </thead>

        <tbody>

          {user.roles.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 6 }}>
                No roles
              </td>
            </tr>
          )}

          {user.roles.map((r:any, i:number) => (
            <tr key={i}>
              <td style={{ padding: 6 }}>{r.department}</td>
              <td style={{ padding: 6 }}>{r.level}</td>
              <td style={{ padding: 6 }}>{r.project ?? "Global"}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => removeRole(r)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}

        </tbody>
      </table>

      <h3 style={{ marginTop: 30 }}>Assign Role</h3>

      <div style={{ marginTop: 10 }}>

        <select
          value={selectedDept}
          onChange={e => {
            setSelectedDept(e.target.value)
            setSelectedLevel("")
            setSelectedProject("")
          }}
          style={{ marginRight: 10 }}
        >
          <option value="">Department</option>

          {departments.map((d:any) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}

        </select>

        <select
          value={selectedLevel}
          onChange={e => setSelectedLevel(e.target.value)}
          style={{ marginRight: 10 }}
        >
          <option value="">Level</option>

          {levels.map((l:any) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}

        </select>

        <select
          value={selectedProject}
          disabled={!projectEnabled}
          onChange={e => setSelectedProject(Number(e.target.value))}
          style={{ marginRight: 10 }}
        >
          <option value="">Global</option>

          {projects.map((p:any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}

        </select>

        <button onClick={assignRole}>
          Add
        </button>

      </div>

    </div>
  )
}