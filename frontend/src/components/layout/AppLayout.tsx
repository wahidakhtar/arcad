import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import { useAuth } from "../../context/AuthContext"

export default function AppLayout() {
  const { roles, loading } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (loading) return null

  const projects = Array.from(new Set(roles.map(r => r.project)))

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        projects={projects}
        onActivePlusClick={() => setShowModal(true)}
      />

      <div style={{ flex: 1, padding: 20 }}>
        <Outlet context={{ showModal, setShowModal }} />
      </div>
    </div>
  )
}
