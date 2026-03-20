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

export type TagPermission = { read: boolean; write: boolean }
export type TagMap = Record<string, TagPermission>

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

export function hasPermission(tags: TagMap, tag: string, action: "read" | "write"): boolean {
  const entry = tags[tag]
  if (!entry) return false
  return action === "read" ? entry.read : entry.write
}

export function isFieldUser(deptKey: string): boolean {
  return deptKey === "fo"
}
