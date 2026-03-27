import { useEffect } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"

import { useAuth } from "./context/AuthContext"
import { useWebSocket } from "./hooks/useWebSocket"
import { squirclePath } from "./lib/squircle"
import PageLayout from "./components/layout/PageLayout"
import DashboardPage from "./features/dashboard/DashboardPage"
import LoginPage from "./features/auth/LoginPage"
import SetupPage from "./features/auth/SetupPage"
import PeoplePage from "./features/people/PeoplePage"
import UserDetailPage from "./features/people/UserDetailPage"
import ProjectsPage from "./features/projects/ProjectsPage"
import SubprojectsPage from "./features/projects/SubprojectsPage"
import OneOffProjectPage from "./features/projects/OneOffProjectPage"
import SiteListPage from "./features/sites/SiteListPage"
import SiteDetailPage from "./features/sites/SiteDetailPage"
import TransactionsPage from "./features/transactions/TransactionsPage"
import PoListPage from "./features/billing/PoListPage"
import RateCardPage from "./features/billing/RateCardPage"
import PoDetailPage from "./features/billing/po/PoDetailPage"
import TicketsPage from "./features/tickets/TicketsPage"
import TicketDetailPage from "./features/tickets/TicketDetailPage"
import UpdatesPage from "./features/updates/UpdatesPage"
import AdminPage from "./features/admin/AdminPage"
import SubconsPage from "./features/subcons/SubconsPage"

function PublicOnly({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, loading, setupRequired } = useAuth()
  const hasStoredToken = Boolean(localStorage.getItem("access_token"))
  if (loading) return <div className="page-shell" />
  if (hasStoredToken || user) return <Navigate to="/dashboard" replace />
  if (setupRequired && location.pathname !== "/setup") return <Navigate to="/setup" replace />
  return <>{children}</>
}

function ProtectedApp() {
  const { user, loading, setupRequired } = useAuth()
  const hasStoredToken = Boolean(localStorage.getItem("access_token"))
  // Establish WS connection for authenticated sessions
  useWebSocket()
  if (loading) {
    return <div className="page-shell flex items-center justify-center font-syne text-2xl text-jscolors-crimson">ARCAD</div>
  }
  if (setupRequired) return <Navigate to="/setup" replace />
  if (!hasStoredToken && !user) return <Navigate to="/login" replace />
  return (
    <PageLayout>
      <Outlet />
    </PageLayout>
  )
}

export default function App() {
  const { setupRequired } = useAuth()

  useEffect(() => {
    const RADIUS = 44

    const squircled = new Set<Element>()

    function apply(el: Element) {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) {
        const r = Math.min(RADIUS, width / 2, height / 2)
        ;(el as HTMLElement).style.clipPath = `path('${squirclePath(width, height, r)}')`
        squircled.add(el)
      }
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) apply(entry.target)
    })

    const observed = new WeakSet<Element>()

    function scan() {
      // Clear stale clip-paths from elements that lost the glass-panel class (e.g. React DOM reuse)
      squircled.forEach((el) => {
        const isGlass = el.classList.contains("glass-panel") && !el.classList.contains("no-squircle")
        const isSquircle = el.classList.contains("squircle")
        if (!el.isConnected || (!isGlass && !isSquircle)) {
          ;(el as HTMLElement).style.clipPath = ""
          squircled.delete(el)
        }
      })
      document.querySelectorAll(".glass-panel:not(.no-squircle), .squircle").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el)
          ro.observe(el)
        }
        apply(el)
      })
    }

    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })
    scan()

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/setup"
        element={
          <PublicOnly>
            <SetupPage />
          </PublicOnly>
        }
      />

      <Route element={<ProtectedApp />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people/:userId" element={<UserDetailPage />} />
        <Route path="/projects-admin" element={<ProjectsPage />} />
        <Route path="/projects/:projectKey/subprojects" element={<SubprojectsPage />} />
        <Route path="/projects/:projectKey/overview" element={<OneOffProjectPage />} />
        <Route path="/projects/:projectKey" element={<SiteListPage />} />
        <Route path="/projects/:projectKey/sub/:subprojectId" element={<SiteListPage />} />
        <Route path="/projects/:projectKey/site/:siteId" element={<SiteDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/billing/po" element={<PoListPage />} />
        <Route path="/billing/po/:poId" element={<PoDetailPage />} />
        <Route path="/billing/rate-card" element={<RateCardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/updates/:siteId" element={<UpdatesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/subcons" element={<SubconsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to={setupRequired ? "/setup" : "/dashboard"} replace />} />
    </Routes>
  )
}
