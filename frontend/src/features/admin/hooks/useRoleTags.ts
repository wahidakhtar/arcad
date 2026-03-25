import { useEffect, useState } from "react"

import { getRoleTags, updateRoleTag } from "../../../services/adminService"
import type { RoleTagsResponse } from "../types"

export default function useRoleTags() {
  const [data, setData] = useState<RoleTagsResponse | null>(null)
  const [matrix, setMatrix] = useState<Record<string, { read: boolean; write: boolean }>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  useEffect(() => {
    void getRoleTags()
      .then((response) => {
        setData(response.data)
        setMatrix(response.data.matrix)
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load role tags"),
      )
  }, [])

  function handleToggle(roleId: number, tagId: number, field: "read" | "write", value: boolean) {
    const key = `${roleId}:${tagId}`
    const previous = matrix[key] ?? { read: false, write: false }
    const updated = { ...previous, [field]: value }

    setMatrix((current) => ({ ...current, [key]: updated }))
    setSaving((current) => new Set(current).add(key))

    void updateRoleTag({ role_id: roleId, tag_id: tagId, read: updated.read, write: updated.write })
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setError(err.response?.data?.detail ?? "Failed to save permission")
        setMatrix((current) => ({ ...current, [key]: previous }))
      })
      .finally(() => {
        setSaving((current) => {
          const next = new Set(current)
          next.delete(key)
          return next
        })
      })
  }

  return { data, matrix, saving, error, handleToggle }
}
