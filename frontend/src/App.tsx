import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"

import { useAuth } from "./context/AuthContext"
import PageLayout from "./components/layout/PageLayout"
import DashboardPage from "./features/dashboard/DashboardPage"
import LoginPage from "./features/auth/LoginPage"
import SetupPage from "./features/auth/SetupPage"
import PeoplePage from "./features/people/PeoplePage"
import UserDetailPage from "./features/people/UserDetailPage"
import ProjectsPage from "./features/projects/ProjectsPage"
import SubprojectsPage from "./features/projects/SubprojectsPage"
import SiteListPage from "./features/sites/SiteListPage"
import SiteDetailPage from "./features/sites/SiteDetailPage"
import TransactionsPage from "./features/transactions/TransactionsPage"
import POsPage from "./features/billing/POsPage"
import InvoicesPage from "./features/billing/InvoicesPage"
import RateCardPage from "./features/billing/RateCardPage"
import TicketsPage from "./features/tickets/TicketsPage"
import TicketDetailPage from "./features/tickets/TicketDetailPage"
import UpdatesPage from "./features/updates/UpdatesPage"

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
        <Route path="/projects/:projectKey" element={<SiteListPage />} />
        <Route path="/projects/:projectKey/sub/:subprojectId" element={<SiteListPage />} />
        <Route path="/projects/:projectKey/site/:siteId" element={<SiteDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/billing/pos" element={<POsPage />} />
        <Route path="/billing/invoices" element={<InvoicesPage />} />
        <Route path="/billing/rate-card" element={<RateCardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/updates/:siteId" element={<UpdatesPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to={setupRequired ? "/setup" : "/dashboard"} replace />} />
    </Routes>
  )
}
