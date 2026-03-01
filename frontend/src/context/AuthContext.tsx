import { createContext, useContext, useEffect, useState } from "react"
import { api } from "../lib/api"

interface Role {
  project: string
  department: string
  level: string
}

interface AuthContextType {
  user: any
  roles: Role[]
  loading: boolean
  refreshAuth: () => void
  getRole: (projectCode: string) => Role | undefined
  canOpenDetail: (projectCode: string) => boolean
  canViewFinance: (projectCode: string) => boolean
  canCreateSite: (projectCode: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuth = () => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setUser(null)
      setRoles([])
      setLoading(false)
      return
    }

    setLoading(true)

    api.get("/auth/me")
      .then((res) => {
        setUser(res.data)
        setRoles(res.data.roles || [])
      })
      .catch(() => {
        setUser(null)
        setRoles([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAuth()
  }, [])

  const getRole = (projectCode: string) =>
    roles.find(r => r.project === projectCode)

  const canOpenDetail = (projectCode: string) => {
    const role = getRole(projectCode)
    if (!role) return false
    if (role.department === "mgmt") return true
    if (role.department === "ops") return ["l2", "l3"].includes(role.level)
    return false
  }

  const canViewFinance = (projectCode: string) => {
    const role = getRole(projectCode)
    if (!role) return false
    if (["acc", "mgmt"].includes(role.department)) return true
    if (role.department === "ops") return ["l2", "l3"].includes(role.level)
    return false
  }

  const canCreateSite = (projectCode: string) => {
    const role = getRole(projectCode)
    if (!role) return false
    return role.department === "ops" && role.level === "l3"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        refreshAuth: fetchAuth,
        getRole,
        canOpenDetail,
        canViewFinance,
        canCreateSite,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("AuthContext not initialized")
  return ctx
}
