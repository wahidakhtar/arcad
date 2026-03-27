import { useEffect, useRef, useState } from "react"

import Button from "../../../components/ui/Button"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import { TAG_OPTIONS, fieldCls, labelCls, tableCls, tableWrapCls, tbodyRowCls, tdCls, thCls, theadRowCls } from "../constants"
import type { UIField, UIFieldsResponse } from "../types"

export default function UiFieldsPanel() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const [fields, setFields] = useState<Record<string, UIField[]>>({})
  const [editingField, setEditingField] = useState<{ project: string; field: UIField } | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<UIField>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [modalError, setModalError] = useState("")
  const dragRef = useRef<number>(-1)
  const dropRef = useRef<number>(-1)

  useEffect(() => {
    void api
      .get<UIFieldsResponse>("/admin/ui-fields")
      .then((response) => setFields(response.data))
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to load UI fields"),
      )
  }, [])

  function openEdit(project: string, field: UIField) {
    setEditingField({ project, field })
    setEditDraft({
      label: field.label,
      list_view: field.list_view,
      form_view: field.form_view,
      bulk_view: field.bulk_view,
      tag: field.tag,
    })
    setModalError("")
  }

  function handleSave() {
    if (!editingField) return
    const { project, field } = editingField
    setSaving(true)
    setModalError("")
    void api
      .patch(`/admin/ui-fields/${project}/${field.id}`, {
        label: editDraft.label,
        list_view: editDraft.list_view,
        form_view: editDraft.form_view,
        bulk_view: editDraft.bulk_view,
        tag: editDraft.tag,
      })
      .then(() => {
        setFields((prev) => ({
          ...prev,
          [project]: prev[project].map((row) => (row.id === field.id ? { ...row, ...editDraft } : row)),
        }))
        setEditingField(null)
      })
      .catch((err: { response?: { data?: { detail?: string } } }) =>
        setModalError(err.response?.data?.detail ?? "Failed to save field"),
      )
      .finally(() => setSaving(false))
  }

  function handleReorder(project: string) {
    const from = dragRef.current
    const to = dropRef.current
    if (from === -1 || to === -1 || from === to) return

    setFields((prev) => {
      const list = [...prev[project]]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { ...prev, [project]: list }
    })

    setFields((prev) => {
      const ids = prev[project].map((field) => field.id)
      void api.post(`/admin/ui-fields/${project}/reorder`, { ids }).catch((err: { response?: { data?: { detail?: string } } }) =>
        setError(err.response?.data?.detail ?? "Failed to reorder fields"),
      )
      return prev
    })

    dragRef.current = -1
    dropRef.current = -1
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Modal open={editingField !== null} title="Edit Field" onClose={() => setEditingField(null)}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Label</label>
            <input type="text" value={String(editDraft.label ?? "")} onChange={(e) => setEditDraft((draft) => ({ ...draft, label: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Tag</label>
            <select
              value={editDraft.tag ?? ""}
              onChange={(e) => setEditDraft((draft) => ({ ...draft, tag: e.target.value === "" ? "" : e.target.value }))}
              className={fieldCls}
            >
              {TAG_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === "" ? "—" : option}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-6">
            {(["list_view", "form_view", "bulk_view"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-jscolors-text/70 cursor-pointer">
                <input type="checkbox" checked={Boolean(editDraft[key])} onChange={(e) => setEditDraft((draft) => ({ ...draft, [key]: e.target.checked }))} className="h-4 w-4" />
                {key === "list_view" ? "List" : key === "form_view" ? "Form" : "Bulk"}
              </label>
            ))}
          </div>
          {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      {Object.keys(fields).map((project) => (
        <div key={project} className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{project.toUpperCase()}</h3>
          <div className={tableWrapCls}>
            <table className={tableCls}>
              <thead>
                <tr className={theadRowCls}>
                  <th className="px-3 py-3 w-8"></th>
                  <th className={thCls}>Label</th>
                  <th className={thCls}>List</th>
                  <th className={thCls}>Form</th>
                  <th className={thCls}>Bulk</th>
                  <th className={thCls}>Tag</th>
                  {canWrite ? <th className={thCls}></th> : null}
                </tr>
              </thead>
              <tbody>
                {(fields[project] ?? []).map((field, index) => (
                  <tr
                    key={field.id}
                    className={tbodyRowCls}
                    draggable={canWrite ? "true" : undefined}
                    onDragStart={(e) => {
                      if (!canWrite) return
                      dragRef.current = index
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragOver={(e) => {
                      if (!canWrite) return
                      e.preventDefault()
                      dropRef.current = index
                    }}
                    onDrop={() => {
                      if (canWrite) handleReorder(project)
                    }}
                  >
                    <td className="px-3 py-4 text-jscolors-text/30 cursor-grab text-base select-none">≡</td>
                    <td className={tdCls}>{field.label}</td>
                    <td className={tdCls}>{field.list_view ? "✓" : "—"}</td>
                    <td className={tdCls}>{field.form_view ? "✓" : "—"}</td>
                    <td className={tdCls}>{field.bulk_view ? "✓" : "—"}</td>
                    <td className={tdCls}>{field.tag || "—"}</td>
                    {canWrite ? (
                      <td className={tdCls}>
                        <Button variant="ghost" size="sm" className="py-1.5" onClick={() => openEdit(project, field)}>
                          Edit
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {(fields[project] ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 7 : 6} className="px-5 py-4 text-center text-sm text-jscolors-text/50">
                      No fields for {project.toUpperCase()}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
