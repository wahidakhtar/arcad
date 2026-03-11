import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import SidebarList from "./SidebarList"

interface Project {
  id: number
  code: string
  name: string
}

interface MenuItem {
  label: string
  path: string
  canAdd?: boolean
}

interface SidebarProps {
  user?: any
  projects: Project[]
  menu: MenuItem[]
  onActivePlusClick?: (path: string, context?: any) => void
  canAddSite?: boolean
}

export default function Sidebar({
  user,
  projects,
  menu,
  onActivePlusClick,
  canAddSite
}: SidebarProps) {

  const [open, setOpen] = useState(true)
  const location = useLocation()

  const projectItems = projects.map((p) => ({
    key: p.code,
    label: p.name,
    path: "/" + p.code
  }))

  return (
    <div
      style={{
        width: 260,
        background: "#8B1A1A",
        color: "white",
        padding: 20,
        display: "flex",
        flexDirection: "column"
      }}
    >

      <div>

        <h3>ARCAD</h3>

        {menu.map((item) => {

          const isActive = location.pathname.startsWith(item.path)

          return (
            <div
              key={item.path}
              style={{
                margin: "15px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >

              <Link
                to={item.path}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontWeight: 600
                }}
              >
                {item.label}
              </Link>

              {item.canAdd && isActive && onActivePlusClick && (
                <button
                  onClick={() => onActivePlusClick(item.path)}
                  style={{
                    background: "white",
                    color: "#8B1A1A",
                    border: "none",
                    borderRadius: 4,
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  +
                </button>
              )}

            </div>
          )
        })}

        <div style={{ marginTop: 20 }}>

          <div
            style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => setOpen(!open)}
          >
            Projects {open ? "▾" : "▸"}
          </div>

          {open && (
            <div style={{ marginTop: 10 }}>
              <SidebarList
                items={projectItems}
                onActivePlusClick={
                  canAddSite && onActivePlusClick
                    ? (project) => onActivePlusClick("/project", { project })
                    : undefined
                }
              />
            </div>
          )}

        </div>

      </div>

      <div style={{ flex: 1 }} />

      <div style={{ marginBottom: 10, fontSize: 14 }}>
        {user?.username}
      </div>

      <button
        style={{
          background: "white",
          color: "#8B1A1A",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          width: "100%",
          fontWeight: 600
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