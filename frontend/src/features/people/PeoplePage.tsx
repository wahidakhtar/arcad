import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import AddModal from "../../common/AddModal"
import { useOutletContext } from "react-router-dom"
import CellRenderer from "../project/CellRenderer"

interface User {
  id: number
  name: string
  username: string
  is_active: boolean
}

export default function PeoplePage() {

  const { showModal, modalType, setShowModal } = useOutletContext<any>()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const res = await api.get("/users")
    setUsers(res.data)
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>

      <h2>People</h2>

      {showModal && modalType === "user" && (
        <AddModal
          entity="user"
          onClose={() => setShowModal(false)}
          onCreated={loadUsers}
        />
      )}

      <table
        style={{
          width: "100%",
          marginTop: 30,
          borderCollapse: "collapse"
        }}
      >

        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Name</th>
            <th style={{ textAlign: "left", padding: 8 }}>Username</th>
            <th style={{ textAlign: "left", padding: 8 }}>Active</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: 8 }}>
                No users
              </td>
            </tr>
          )}

          {users.map(u => (
            <tr key={u.id}>
              <td style={{ padding: 8 }}>
                <CellRenderer
                  row={u}
                  field={{ column_name: "name" }}
                  entity="user"
                />
              </td>
              <td style={{ padding: 8 }}>{u.username}</td>
              <td style={{ padding: 8 }}>
                {u.is_active ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  )
}