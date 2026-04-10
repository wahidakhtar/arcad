import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { api, setUnauthorizedHandler } from "../lib/api"
import { hasPermission, type AuthRole, type AuthUser, type TagMap } from "../lib/auth"

type AuthContextValue = {
  user: AuthUser | null
  roles: AuthRole[]
  tags: TagMap
  projectKeys: string[]
  projectLabels: Record<string, string>
  loading: boolean
  setupRequired: boolean
  login: (username: string, password: string, deviceLabel?: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  can: (tag: string, action: "read" | "write") => boolean
  canPermTag: (permTag?: string | null) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

type MeResponse = {
  id: number
  username: string
  label: string
  roles: AuthRole[]
  tags: TagMap
  project_keys: string[]
  project_labels: Record<string, string>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [roles, setRoles] = useState<AuthRole[]>([])
  const [tags, setTags] = useState<TagMap>({})
  const [projectKeys, setProjectKeys] = useState<string[]>([])
  const [projectLabels, setProjectLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)

  const resetAuthState = useCallback((nextSetupRequired = false) => {
    startTransition(() => {
      setUser(null)
      setRoles([])
      setTags({})
      setProjectKeys([])
      setProjectLabels({})
      setSetupRequired(nextSetupRequired)
      setLoading(false)
    })
  }, [])

  const handleUnauthorized = useCallback(() => {
    resetAuthState(false)
    if (window.location.pathname !== "/login") {
      window.location.assign("/login")
    }
  }, [resetAuthState])

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
    let nextUser: AuthUser | null = null
    let nextRoles: AuthRole[] = []
    let nextTags: TagMap = {}
    let nextProjectKeys: string[] = []
    let nextProjectLabels: Record<string, string> = {}
    let nextSetupRequired = false
    try {
      const response = await api.get<MeResponse>("/auth/me")
      nextUser = {
        id: response.data.id,
        username: response.data.username,
        label: response.data.label,
      }
      nextRoles = response.data.roles
      nextTags = response.data.tags ?? {}
      nextProjectKeys = response.data.project_keys ?? []
      nextProjectLabels = response.data.project_labels ?? {}
    } catch {
      nextSetupRequired = await fetchSetupRequired()
    } finally {
      startTransition(() => {
        setUser(nextUser)
        setRoles(nextRoles)
        setTags(nextTags)
        setProjectKeys(nextProjectKeys)
        setProjectLabels(nextProjectLabels)
        setSetupRequired(nextSetupRequired)
        setLoading(false)
      })
    }
  }

  useEffect(() => {
    void refreshAuth()
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  async function login(username: string, password: string, deviceLabel?: string) {
    await api.post("/auth/login", {
      username,
      password,
      device_label: deviceLabel ?? "office-browser",
    })
    // Cookies are set by the server; fetch full session state.
    await refreshAuth()
  }

  async function logout() {
    try {
      await api.delete("/auth/logout")
    } finally {
      resetAuthState(false)
      await fetchSetupRequired()
      window.location.assign("/login")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        tags,
        projectKeys,
        projectLabels,
        loading,
        setupRequired,
        login,
        logout,
        refreshAuth,
        can: (tag, action) => hasPermission(tags, tag, action),
        canPermTag: (permTag) => {
          if (!permTag) return true
          const [tag, action = "read"] = permTag.split(":")
          return hasPermission(tags, tag, action as "read" | "write")
        },
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
