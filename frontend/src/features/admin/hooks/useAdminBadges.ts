import { useEffect, useState } from "react"

import { getAdminBadges, updateAdminBadge } from "../../../services/adminService"
import type { Badge } from "../types"

export default function useAdminBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [editDraft, setEditDraft] = useState({ label: "", color: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [modalError, setModalError] = useState("")

  useEffect(() => {
    void getAdminBadges()
      .then((response) => setBadges(response.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load badges"),
      )
  }, [])

  function openEdit(badge: Badge) {
    setEditingBadge(badge)
    setEditDraft({ label: badge.label, color: badge.color ?? "" })
    setModalError("")
  }

  function closeEdit() {
    setEditingBadge(null)
  }

  function saveBadge() {
    if (!editingBadge) return
    setSaving(true)
    setModalError("")
    void updateAdminBadge(editingBadge.id, { label: editDraft.label, color: editDraft.color || null })
      .then(() => {
        setBadges((prev) =>
          prev.map((badge) =>
            badge.id === editingBadge.id ? { ...badge, label: editDraft.label, color: editDraft.color || null } : badge,
          ),
        )
        setEditingBadge(null)
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setModalError(err.response?.data?.detail ?? "Failed to save badge"),
      )
      .finally(() => setSaving(false))
  }

  return {
    badges,
    editingBadge,
    editDraft,
    setEditDraft,
    saving,
    error,
    modalError,
    openEdit,
    closeEdit,
    saveBadge,
  }
}
