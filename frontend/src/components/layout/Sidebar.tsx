import { useEffect, useRef, useState } from "react"
import { Link, NavLink } from "react-router-dom"

import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

type SidebarProject = {
  id: number
  key: string
  label: string
  active: boolean
  recurring: boolean
  subprojects: Array<{ id: number; batch_date: string | null }>
}

export default function Sidebar() {
  const { user, roles, tags, projectKeys, logout } = useAuth()
  const [projects, setProjects] = useState<SidebarProject[]>([])
  const [counts, setCounts] = useState({ transactions: 0, tickets: 0 })
  const countsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canTag = (tag: string) => tags[tag]?.read === true

  useEffect(() => {
    void api.get("/projects").then((r) => setProjects(r.data)).catch(() => {})

    const fetchCounts = () => {
      void api.get("/projects/counts").then((r) => setCounts(r.data)).catch(() => {})
    }
    fetchCounts()
    countsTimerRef.current = setInterval(fetchCounts, 60_000)
    return () => {
      if (countsTimerRef.current) clearInterval(countsTimerRef.current)
    }
  }, [])

  return (
    <aside className="glass-panel flex h-full w-[260px] shrink-0 flex-col overflow-hidden">
      <div className="border-b border-jscolors-crimson/10 px-5 py-4">
        <Link to="/dashboard">
          <img src="/logo.png" alt="ARCAD" className="h-16 w-full rounded-2xl border border-jscolors-gold/30 bg-white object-contain p-2 shadow-glow" />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 text-sm">
        <SectionLink to="/dashboard" label="Dashboard" />
        {canTag("people") && <SectionLink to="/people" label="People" />}
        {canTag("project") && <SectionLink to="/projects-admin" label="Projects" />}

        {canTag("site") && roles.some((r) => r.project_id !== null || r.key === "mgmtl3") && (
        <div className="space-y-3">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">Project Modules</p>
          {projects
            .filter((project) => project.recurring && projectKeys.includes(project.key))
            .map((project) => (
              <div key={project.id} className="space-y-2">
                <NavLink
                  to={`/projects/${project.key}`}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                      isActive ? "bg-jscolors-crimson text-white shadow-glow" : "bg-white/60 text-jscolors-text hover:bg-white"
                    }`
                  }
                >
                  <span className="font-medium">{project.label}</span>
                  <span className="rounded-full border border-current/15 px-2 py-0.5 text-[10px] uppercase">
                    {project.active ? "Live" : "Off"}
                  </span>
                </NavLink>
                {project.subprojects.map((subproject) => (
                  <NavLink
                    key={subproject.id}
                    to={`/projects/${project.key}/sub/${subproject.id}`}
                    className={({ isActive }) =>
                      `ml-4 flex rounded-xl px-3 py-2 text-xs transition ${
                        isActive ? "bg-jscolors-gold/30 text-jscolors-text" : "text-jscolors-text/70 hover:bg-white/60"
                      }`
                    }
                  >
                    {subproject.batch_date ? new Date(subproject.batch_date).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Bucket"}
                  </NavLink>
                ))}
              </div>
            ))}
        </div>
        )}

        {canTag("transaction") && <SectionLink to="/transactions" label={`Transactions (${counts.transactions})`} />}
        {canTag("ticket") && <SectionLink to="/tickets" label={`Tickets (${counts.tickets})`} />}
        {canTag("rate") && <SectionLink to="/billing/rate-card" label="Rate Card" />}
        {canTag("billing") && (
          <div className="space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-jscolors-text/40">Billing</p>
            <SectionLink to="/billing/pos" label="PO" compact />
            <SectionLink to="/billing/invoices" label="Invoice" compact />
          </div>
        )}
      </nav>

      <div className="border-t border-jscolors-crimson/10 px-4 py-4">
        <div className="mb-3 rounded-2xl bg-jscolors-crimson/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.24em] text-jscolors-text/40">Signed In</div>
          <div className="mt-1 font-syne text-base font-semibold text-jscolors-crimson">{user?.label ?? "Guest"}</div>
          <div className="text-xs text-jscolors-text/60">{user?.username}</div>
        </div>
        <button type="button" onClick={() => void logout()} className="premium-button-secondary w-full">
          Logout
        </button>
      </div>
    </aside>
  )
}

function SectionLink({ to, label, compact = false }: { to: string; label: string; compact?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center rounded-2xl ${compact ? "ml-4 px-3 py-2 text-xs" : "px-3 py-2.5"} transition ${
          isActive ? "bg-jscolors-crimson text-white shadow-glow" : "bg-white/60 text-jscolors-text hover:bg-white"
        }`
      }
    >
      {label}
    </NavLink>
  )
}
