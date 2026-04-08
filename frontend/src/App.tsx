import { Suspense, lazy, useEffect } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"

import { useAuth } from "./context/AuthContext"
import { useWebSocket } from "./hooks/useWebSocket"
import { squirclePath } from "./lib/squircle"
import PageLayout from "./components/layout/PageLayout"
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"))
const LoginPage = lazy(() => import("./features/auth/LoginPage"))
const SetupPage = lazy(() => import("./features/auth/SetupPage"))
const PeoplePage = lazy(() => import("./features/people/PeoplePage"))
const UserDetailPage = lazy(() => import("./features/people/UserDetailPage"))
const ProjectsPage = lazy(() => import("./features/projects/ProjectsPage"))
const SubprojectsPage = lazy(() => import("./features/projects/SubprojectsPage"))
const OneOffProjectPage = lazy(() => import("./features/projects/OneOffProjectPage"))
const SiteListPage = lazy(() => import("./features/sites/SiteListPage"))
const SiteDetailPage = lazy(() => import("./features/sites/SiteDetailPage"))
const TransactionsPage = lazy(() => import("./features/transactions/TransactionsPage"))
const TransactionDetailPage = lazy(() => import("./features/transactions/TransactionDetailPage"))
const PoListPage = lazy(() => import("./features/billing/PoListPage"))
const RateCardPage = lazy(() => import("./features/billing/RateCardPage"))
const RateHistoryPage = lazy(() => import("./features/billing/RateHistoryPage"))
const PoDetailPage = lazy(() => import("./features/billing/po/PoDetailPage"))
const TicketsPage = lazy(() => import("./features/tickets/TicketsPage"))
const TicketDetailPage = lazy(() => import("./features/tickets/TicketDetailPage"))
const UpdatesPage = lazy(() => import("./features/updates/UpdatesPage"))
const AdminPage = lazy(() => import("./features/admin/AdminPage"))
const SchemaBrowserPage = lazy(() => import("./features/admin/schema-browser/SchemaBrowserPage"))
const ErrorLogPage = lazy(() => import("./features/admin/error-log/ErrorLogPage"))
const SubconsPage = lazy(() => import("./features/subcons/SubconsPage"))
const SubconDetailPage = lazy(() => import("./features/subcons/SubconDetailPage"))

function PublicOnly({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, loading, setupRequired } = useAuth()
  if (loading) return <div className="page-shell" />
  if (user) return <Navigate to="/dashboard" replace />
  if (setupRequired && location.pathname !== "/setup") return <Navigate to="/setup" replace />
  return <>{children}</>
}

function ProtectedApp() {
  const { user, loading, setupRequired } = useAuth()
  // Establish WS connection for authenticated sessions
  useWebSocket()
  if (loading) {
    return <div className="page-shell flex items-center justify-center font-syne text-2xl text-jscolors-crimson">ARCAD</div>
  }
  if (setupRequired) return <Navigate to="/setup" replace />
  if (!user) return <Navigate to="/login" replace />
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
    <Suspense fallback={<div className="page-shell flex items-center justify-center font-syne text-2xl text-jscolors-crimson">ARCAD</div>}>
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
        <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
        <Route path="/billing/po" element={<PoListPage />} />
        <Route path="/billing/po/:poId" element={<PoDetailPage />} />
        <Route path="/billing/rate-card" element={<RateCardPage />} />
        <Route path="/billing/rate-history/:job_key" element={<RateHistoryPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/updates/:siteId" element={<UpdatesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/schema-browser" element={<SchemaBrowserPage />} />
        <Route path="/admin/error-log" element={<ErrorLogPage />} />
        <Route path="/subcons" element={<SubconsPage />} />
        <Route path="/subcons/:subconId" element={<SubconDetailPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to={setupRequired ? "/setup" : "/dashboard"} replace />} />
    </Routes>
    </Suspense>
  )
}
