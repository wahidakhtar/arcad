import { useEffect, useState } from "react"
import { api } from "../../lib/api"
import { Link, Outlet, useLocation } from "react-router-dom"

export default function AppLayout() {
  const [project, setProject] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const location = useLocation()

  useEffect(() => {
    api.get("/v1/project/my").then((res) => {
      setProject(res.data)
    })
  }, [])

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          width: 260,
          background: "#8B1A1A",
          color: "white",
          padding: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div>
          <h3>ARCAD</h3>

          {project.map((p) => {
            const isActive = location.pathname === "/project/" + p.id

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "10px 0",
                }}
              >
                <Link
                  to={"/project/" + p.id}
                  style={{ color: "white", textDecoration: "none" }}
                >
                  {p.name}
                </Link>

                {isActive && (
                  <button
                    style={{
                      background: "white",
                      color: "#8B1A1A",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                    onClick={() => setShowModal(true)}
                  >
                    +
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button
          style={{
            background: "white",
            color: "#8B1A1A",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            width: "100%",
            fontWeight: 600,
          }}
          onClick={() => {
            localStorage.removeItem("access_token")
            window.location.replace("/login")
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <Outlet context={{ showModal, setShowModal }} />
      </div>
    </div>
  )
}
