import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LoginPage from "./features/auth/LoginPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AppLayout from "./components/layout/AppLayout"
import ProjectPage from "./features/project/ProjectPage"

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <div>Dashboard</div> },
      { path: "project/:project_id", element: <ProjectPage /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
