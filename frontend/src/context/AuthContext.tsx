import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { api } from "../lib/api"
import { decodeJWT, hasPermission, type AuthRole, type AuthUser } from "../lib/auth"

type AuthContextValue = {
  user: AuthUser | null
  roles: AuthRole[]
  loading: boolean
  setupRequired: boolean
  login: (username: string, password: string, deviceLabel?: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  can: (projectId: number | null, tag: string, action: "read" | "write") => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

type LoginResponse = {
  access_token: string
  refresh_token: string
  user_id: number
  username: string
  label: string
  roles: AuthRole[]
}

type MeResponse = {
  id: number
  username: string
  label: string
  roles: AuthRole[]
}

function applySession(data: LoginResponse | null) {
  if (!data) {
    clearStoredSession()
    return
  }
  localStorage.setItem("access_token", data.access_token)
  localStorage.setItem("refresh_token", data.refresh_token)
}

function clearStoredSession() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("auth_user")
  localStorage.removeItem("auth_roles")
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [roles, setRoles] = useState<AuthRole[]>([])
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)

  async function fetchSetupRequired() {
    try {
      const response = await api.get<{ setup_required: boolean; user_count: number }>("/setup/status")
      const nextValue = Boolean(response.data.setup_required)
      setSetupRequired(nextValue)
      return nextValue
    } catch {
      setSetupRequired(false)
      return false
    }
  }

  async function refreshAuth() {
    const token = localStorage.getItem("access_token")
    let nextUser: AuthUser | null = null
    let nextRoles: AuthRole[] = []
    let nextSetupRequired = false
    try {
      if (!token) {
        nextSetupRequired = await fetchSetupRequired()
        return
      }

      const payload = decodeJWT(token)
      if (!payload?.sub) {
        clearStoredSession()
        nextSetupRequired = await fetchSetupRequired()
        return
      }

      const response = await api.get<MeResponse>("/auth/me")
      nextUser = {
        id: response.data.id,
        username: response.data.username,
        label: response.data.label,
      }
      nextRoles = response.data.roles
      localStorage.setItem("auth_user", JSON.stringify(nextUser))
      localStorage.setItem("auth_roles", JSON.stringify(nextRoles))
      nextSetupRequired = false
    } catch {
      clearStoredSession()
      nextSetupRequired = await fetchSetupRequired()
    } finally {
      startTransition(() => {
        setUser(nextUser)
        setRoles(nextRoles)
        setSetupRequired(nextSetupRequired)
        setLoading(false)
      })
    }
  }

  useEffect(() => {
    void refreshAuth()
  }, [])

  async function login(username: string, password: string, deviceLabel?: string) {
    const response = await api.post<LoginResponse>("/auth/login", {
      username,
      password,
      device_label: deviceLabel ?? "office-browser",
    })
    applySession(response.data)
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ id: response.data.user_id, username: response.data.username, label: response.data.label }),
    )
    localStorage.setItem("auth_roles", JSON.stringify(response.data.roles))
    startTransition(() => {
      setUser({ id: response.data.user_id, username: response.data.username, label: response.data.label })
      setRoles(response.data.roles)
      setSetupRequired(false)
      setLoading(false)
    })
  }

  async function logout() {
    try {
      await api.delete("/auth/logout")
    } finally {
      clearStoredSession()
      startTransition(() => {
        setUser(null)
        setRoles([])
        setLoading(false)
      })
      await fetchSetupRequired()
      window.location.assign("/login")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        setupRequired,
        login,
        logout,
        refreshAuth,
        can: (projectId, tag, action) => hasPermission(roles, projectId, tag, action),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("AuthContext is not available")
  }
  return context
}
