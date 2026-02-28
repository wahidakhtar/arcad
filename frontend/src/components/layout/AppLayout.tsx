import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { api } from "../../lib/api"
import Sidebar from "./Sidebar"

export default function AppLayout() {
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.get("/project/my").then((res) => {
      setProjects(res.data)
    })
  }, [])

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
