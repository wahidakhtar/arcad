import { useEffect, useState } from "react"

import { api } from "../../../lib/api"
import type { BadgeTransitionsResponse } from "../types"

export default function useAdminTransitions() {
  const [data, setData] = useState<BadgeTransitionsResponse | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newRow, setNewRow] = useState({ project: "mi", type_id: "", from_id: "", to_id: "" })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [modalError, setModalError] = useState("")

  function fetchData() {
    void api
      .get<BadgeTransitionsResponse>("/admin/badge-transitions")
      .then((response) => setData(response.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load badge transitions"),
      )
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openAdd() {
    setNewRow({ project: "mi", type_id: "", from_id: "", to_id: "" })
    setModalError("")
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
  }

  function handleRemove(project: string, id: number) {
    setData((prev) => {
      if (!prev) return prev
      return { ...prev, [project]: prev[project as keyof BadgeTransitionsResponse].filter((transition) => transition.id !== id) }
    })

    void api.delete(`/admin/badge-transitions/${project}/${id}`).catch((err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail ?? "Failed to remove transition")
      fetchData()
    })
  }

  function handleAdd() {
    if (!newRow.type_id || !newRow.from_id || !newRow.to_id) {
      setModalError("All fields are required.")
      return
    }
    setAdding(true)
    setModalError("")
    void api
      .post("/admin/badge-transitions", {
        project: newRow.project,
        type_id: Number(newRow.type_id),
        from_id: Number(newRow.from_id),
        to_id: Number(newRow.to_id),
      })
      .then(() => {
        setAddOpen(false)
        fetchData()
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setModalError(err.response?.data?.detail ?? "Failed to add transition"),
      )
      .finally(() => setAdding(false))
  }

  return {
    data,
    addOpen,
    newRow,
    setNewRow,
    adding,
    error,
    modalError,
    openAdd,
    closeAdd,
    handleRemove,
    handleAdd,
  }
}
