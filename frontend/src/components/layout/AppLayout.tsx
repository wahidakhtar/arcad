import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import AddModal from "../../common/AddModal"
import { useAuth } from "../../context/AuthContext"

type ModalType = "site" | "user" | null

interface Project {
  id: number
  code: string
  name: string
}

export default function AppLayout() {

  const { roles, user, permissions = [], loading, refreshAuth } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [modalContext, setModalContext] = useState<Record<string, any>>({})
  const [canAddSite, setCanAddSite] = useState(false)

  if (loading) return null

  const hasFinance = roles.some((r: any) => r.department === "acc")

  const canAddUser = permissions.includes("user_manage")

  const menu = [
    { label: "Dashboard", path: "/dashboard" },

    ...(canAddUser
      ? [{ label: "People", path: "/people", canAdd: true }]
      : []),

    ...(hasFinance
      ? [{ label: "Finance", path: "/finance" }]
      : []),

    { label: "Operations", path: "/operations" }
  ]

  useEffect(() => {

    const token = localStorage.getItem("access_token")

    fetch("/api/v1/project/my", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setProjects(data || []))
      .catch(() => setProjects([]))

  }, [roles])

  const handlePlusClick = (path: string, context: Record<string, any> = {}) => {

    if (path === "/people") {
      setModalType("user")
      setModalContext(context)
    } else {
      setModalType("site")
      setModalContext(context)
    }

    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setModalType(null)
    setModalContext({})
  }

  const handleCreated = () => {

    try {
      refreshAuth()
    } catch {}

    window.dispatchEvent(
      new CustomEvent("entityCreated", {
        detail: { entity: modalType, context: modalContext }
      })
    )

    handleModalClose()
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      <Sidebar
        user={user}
        projects={projects}
        menu={menu}
        canAddSite={canAddSite}
        onActivePlusClick={handlePlusClick}
      />

      <div style={{ flex: 1, padding: 20 }}>
        <Outlet
          context={{
            showModal,
            setShowModal,
            modalType,
            setModalType,
            setModalContext,
            setCanAddSite
          }}
        />
      </div>

      {showModal && modalType && (
        <AddModal
          entity={modalType}
          context={modalContext}
          onClose={handleModalClose}
          onCreated={handleCreated}
        />
      )}

    </div>
  )
}