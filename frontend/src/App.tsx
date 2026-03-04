import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./components/layout/AppLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import DashboardPage from "./features/dashboard/DashboardPage"
import ProjectPage from "./features/project/ProjectPage"
import LoginPage from "./features/auth/LoginPage"

import SiteLayout from "./features/project/site/SiteLayout"
import ProjectSiteDetailsRouter from "./features/project/site/ProjectSiteDetailsRouter"
import SiteFeFinancePage from "./features/project/site/SiteFeFinancePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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

          {/* Dynamic project routing */}
          <Route path=":projectCode" element={<ProjectPage />} />

          <Route path=":projectCode/site/:siteId" element={<SiteLayout />}>
            <Route index element={<Navigate to="details" />} />
            <Route path="details" element={<ProjectSiteDetailsRouter />} />
            <Route path="fe" element={<SiteFeFinancePage />} />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
