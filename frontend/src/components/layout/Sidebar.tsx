import { useState } from "react"
import { Link } from "react-router-dom"
import ProjectList from "./ProjectList"

interface SidebarProps {
  projects: string[]
  onActivePlusClick?: () => void
  canAddSite?: boolean
}

export default function Sidebar({ projects, onActivePlusClick, canAddSite }: SidebarProps) {
  const [open, setOpen] = useState(true)

  return (
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

        <div style={{ margin: "15px 0" }}>
          <Link
            to="/dashboard"
            style={{ color: "white", textDecoration: "none", fontWeight: 600 }}
          >
            Dashboard
          </Link>
        </div>

        <div style={{ marginTop: 20 }}>
          <div
            style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => setOpen(!open)}
          >
            Projects {open ? "▾" : "▸"}
          </div>

          {open && (
            <div style={{ marginTop: 10 }}>
              <ProjectList
                projects={projects}
                onActivePlusClick={canAddSite ? onActivePlusClick : undefined}
              />
            </div>
          )}
        </div>
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
  )
}
