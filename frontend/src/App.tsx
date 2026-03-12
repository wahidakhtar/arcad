import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"

import AppLayout from "./components/layout/AppLayout"
import ProtectedRoute from "./components/ProtectedRoute"

import LoginPage from "./features/auth/LoginPage"
import SetupPage from "./features/auth/SetupPage"

import DashboardPage from "./features/dashboard/DashboardPage"
import ProjectPage from "./features/project/ProjectPage"

import SiteLayout from "./features/project/site/SiteLayout"
import ProjectSiteDetailsRouter from "./features/project/site/ProjectSiteDetailsRouter"
import SiteFeFinancePage from "./features/project/site/SiteFeFinancePage"

import PeoplePage from "./features/people/PeoplePage"
import UserDetailPage from "./features/people/UserDetailPage"

import FinancePage from "./features/finance/FinancePage"
import RateCardPage from "./features/finance/RateCardPage"
import PoInvoicePage from "./features/finance/PoInvoicePage"
import FinanceRequestsPage from "./features/finance/FinanceRequestsPage"


function PublicRoute({ children }: { children: React.ReactNode }) {

  const { user, loading } = useAuth()

  if (loading) return <div />

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


export default function App() {

  return (
    <BrowserRouter>

      <Routes>

        {/* public routes */}

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/setup"
          element={
            <PublicRoute>
              <SetupPage />
            </PublicRoute>
          }
        />

        {/* protected application */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route index element={<Navigate to="dashboard" />} />

          <Route path="dashboard" element={<DashboardPage />} />

          {/* people */}
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:userId" element={<UserDetailPage />} />

          {/* finance */}
          <Route path="finance" element={<FinancePage />}>
            <Route path="rate-card" element={<RateCardPage />} />
            <Route path="po-invoice" element={<PoInvoicePage />} />
            <Route path="requests" element={<FinanceRequestsPage />} />
          </Route>

          {/* project pages */}
          <Route path=":projectCode" element={<ProjectPage />} />

          {/* site pages */}
          <Route path=":projectCode/site/:siteId" element={<SiteLayout />}>
            <Route index element={<Navigate to="details" />} />
            <Route path="details" element={<ProjectSiteDetailsRouter />} />
            <Route path="fe" element={<SiteFeFinancePage />} />
          </Route>

        </Route>

        {/* fallback */}

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

    </BrowserRouter>
  )
}