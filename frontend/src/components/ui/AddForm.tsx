import { useState } from "react"

import FieldRenderer, { type FieldDefinition } from "./FieldRenderer"

export default function AddForm({
  fields,
  states = [],
  onSubmit,
}: {
  fields: FieldDefinition[]
  states?: Array<{ id: number; label: string }>
  onSubmit: (data: Record<string, string | boolean>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>({})

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(form)
      }}
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
      <div className="md:col-span-2">
        <button className="premium-button" type="submit">
          Submit
        </button>
      </div>
    </form>
  )
}
