export type AuthRole = {
  id: number
  key: string
  label: string
  dept_key: string
  level_key: string
  project_id: number | null
}

export type AuthUser = {
  id: number
  username: string
  label: string
}

export type TokenPayload = {
  sub: string
  exp: number
  username?: string
}

export function decodeJWT(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return decoded
  } catch {
    return null
  }
}

export function hasPermission(roles: AuthRole[], projectId: number | null, tag: string, action: "read" | "write"): boolean {
  return roles.some((role) => {
    const scoped = role.project_id === null || projectId === null || role.project_id === projectId
    if (!scoped) return false
    if (action === "read") return ["mgmt", "acc", "ops", "hr", "fo"].includes(role.dept_key)
    if (tag === "billing") return ["mgmt", "acc"].includes(role.dept_key)
    if (tag === "user") return ["mgmt", "hr"].includes(role.dept_key)
    return ["mgmt", "ops", "acc"].includes(role.dept_key)
  })
}

export function isFieldUser(deptKey: string): boolean {
  return deptKey === "fo"
}
