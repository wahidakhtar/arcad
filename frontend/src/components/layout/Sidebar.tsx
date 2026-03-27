import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router-dom"

import Button from "../ui/Button"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

type SidebarProject = {
  id: number
  key: string
  label: string
  active: boolean
  recurring: boolean
}

export default function Sidebar() {
  const { user, can, projectKeys, logout } = useAuth()
  const [projects, setProjects] = useState<SidebarProject[]>([])
  const [counts, setCounts] = useState({ transactions: 0, tickets: 0 })

  useEffect(() => {
    void api.get("/me/projects").then((r) => setProjects(r.data)).catch(() => {})

    function fetchCounts() {
      void api.get("/projects/counts").then((r) => setCounts(r.data)).catch(() => {})
    }

    // Initial fetch
    fetchCounts()

    // Listen for WebSocket-triggered refresh events instead of polling
    window.addEventListener("refresh-counts", fetchCounts)
    return () => {
      window.removeEventListener("refresh-counts", fetchCounts)
    }
  }, [])

  return (
    <aside className="squircle overflow-hidden flex h-full w-[260px] shrink-0 flex-col border border-white/50 bg-white/75 backdrop-blur-xl" style={{ boxShadow: "0 18px 60px rgba(83,20,20,0.12)" }}>
      <div className="border-b border-jscolors-crimson/10 px-5 py-4">
        <Link to="/dashboard" className="block">
          <div className="squircle overflow-hidden h-20 w-full bg-jscolors-gold/30 p-px">
            <div className="squircle h-full w-full bg-white flex items-center justify-center">
              <img src="/logo.png" alt="ARCAD" className="h-full w-full object-contain p-2" />
            </div>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 text-sm">
        <SectionLink to="/dashboard" label="Dashboard" />
        {can("people", "read") && <SectionLink to="/people" label="People" />}
        {can("project", "read") && <SectionLink to="/projects-admin" label="Projects" />}
        {can("subproject", "write") && <SectionLink to="/subcons" label="Subcons" />}

        {can("site", "read") && (
        <div className="space-y-3">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">Project Modules</p>
          {projects
            .filter((project) => project.recurring && projectKeys.includes(project.key))
            .map((project) => {
              const projectDest = `/projects/${project.key}?exclude_staged=true`
              return (
              <NavLink
                key={project.id}
                to={projectDest}
                className={({ isActive }) =>
                  `flex items-center justify-start rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    isActive
                      ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
                      : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40 hover:bg-white/90"
                  }`
                }
              >
                {project.label}
              </NavLink>
              )
            })}
        </div>
        )}

        {can("transaction", "read") && <SectionLink to="/transactions" label={`Transactions (${counts.transactions})`} />}
        {can("ticket", "read") && <SectionLink to="/tickets" label={`Tickets (${counts.tickets})`} />}
        {can("rate", "read") && <SectionLink to="/billing/rate-card" label="Rate Card" />}
        {can("billing", "read") && <SectionLink to="/billing/po" label="Billing" />}
        {can("admin", "read") && (
          <SectionLink to="/admin" label="Admin" />
        )}
      </nav>

      <div className="border-t border-jscolors-crimson/10 px-4 py-4">
        <div className="mb-3 rounded-2xl bg-jscolors-crimson/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.24em] text-jscolors-text/40">Signed In</div>
          <div className="mt-1 font-syne text-base font-semibold text-jscolors-crimson">{user?.label ?? "Guest"}</div>
        </div>
        <Button type="button" variant="secondary" className="w-full" onClick={() => void logout()}>
          Logout
        </Button>
      </div>
    </aside>
  )
}

function SectionLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-start rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
          isActive
            ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
            : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40 hover:bg-white/90"
        }`
      }
    >
      {label}
    </NavLink>
  )
}
