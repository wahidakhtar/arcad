import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { api } from "../lib/api"

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element
}) {
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")

    if (!token) {
      setIsValid(false)
      return
    }

    api
      .get("/auth/me")
      .then(() => setIsValid(true))
      .catch(() => {
        localStorage.removeItem("access_token")
        setIsValid(false)
      })
  }, [])

  if (isValid === null) return null
  if (!isValid) return <Navigate to="/login" replace />

  return children
}
