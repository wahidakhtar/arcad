import { useState } from "react"

import FieldRenderer, { type FieldDefinition } from "./FieldRenderer"

const TODAY = new Date().toISOString().slice(0, 10)

function buildInitialForm(fields: FieldDefinition[]): Record<string, string | boolean> {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === "bool" ? false : f.type === "date" ? TODAY : ""]),
  )
}

export default function AddForm({
  fields,
  states = [],
  onSubmit,
  onLoadingChange,
  formId,
}: {
  fields: FieldDefinition[]
  states?: Array<{ id: number; label: string }>
  onSubmit: (data: Record<string, string | boolean>) => Promise<void>
  onLoadingChange?: (loading: boolean) => void
  formId?: string
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>(() => buildInitialForm(fields))
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleError(err: unknown) {
    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    setError(detail ?? "Failed to submit. Please try again.")
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (loading) return
    setError("")
    setLoading(true)
    onLoadingChange?.(true)
    try {
      await onSubmit(form)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  return (
    <form
      id={formId}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={handleSubmit}
    >
      {fields.map((field) => (
        <label key={field.key} className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/45">{field.label}</span>
          <FieldRenderer
            mode="input"
            field={{
              ...field,
              type: field.type ?? (field.key === "state_id" ? "dropdown" : field.type),
              options: field.options ?? (field.key === "state_id" ? states.map((state) => ({ label: state.label, value: state.id })) : undefined),
            }}
            value={form[field.key] ?? (field.type === "bool" ? false : "")}
            onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
          />
        </label>
      ))}
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </form>
  )
}
