// frontend/src/features/common/AddModal.tsx
import { useEffect, useState } from "react"
import { getForm } from "./forms/formRegistry"
import { getClient } from "./services/clientRegistry"

type AddModalProps = {
  entity: string // "site" | "user" | ...
  context?: Record<string, any>
  onClose: () => void
  onCreated: () => void
}

export default function AddModal({
  entity,
  context = {},
  onClose,
  onCreated,
}: AddModalProps) {
  const fields = getForm(entity, context) || []
  const client = getClient(entity, context) || { create: async () => ({ success: false, error: "no client" }) }

  const initialState = fields.reduce((acc: any, f: any) => {
    if (f.default !== undefined) acc[f.name] = f.default
    return acc
  }, {})

  const [form, setForm] = useState<any>(initialState)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => {
    // when entity/context changes reset form to defaults
    setForm(initialState)
    setErrors({})
  }, [entity, JSON.stringify(context)]) // tiny hack: re-init when context changes

  const validate = () => {
    const err: Record<string,string> = {}
    for (const f of fields) {
      if (f.required && (form[f.name] === undefined || form[f.name] === "")) {
        err[f.name] = `${f.label || f.name} is required`
      }
    }
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleChange = (name: string, value: any) => {
    setForm((s: any) => ({ ...s, [name]: value }))
    if (errors[name]) setErrors((e) => { const copy = { ...e }; delete copy[name]; return copy })
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = { ...context, ...form }

    // convert numeric fields if type:number or name indicates numeric
    for (const f of fields) {
      if (f.type === "number" && payload[f.name] !== undefined) {
        const n = Number(payload[f.name])
        payload[f.name] = Number.isFinite(n) ? n : payload[f.name]
      }
    }

    if (payload.height_m) payload.height_m = Number(payload.height_m)

    setSaving(true)
    try {
      const result = await client.create(payload)
      if (result && result.success) {
        onCreated()
        onClose()
        return
      }

      const err = result?.error ?? "unknown error"
      alert(JSON.stringify(err))
    } catch (err: any) {
      alert(err?.message ?? JSON.stringify(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>Add {entity}</h3>

        {fields.length === 0 && <div style={{ marginBottom: 8 }}>No form defined for {entity}.</div>}

        {fields.map((f: any) => {
          const val = form[f.name] ?? ""
          const commonProps = {
            key: f.name,
            placeholder: f.label || f.name,
            value: val,
            onChange: (e: any) => handleChange(f.name, e?.target ? e.target.value : e),
            style: inputStyle
          }

          if (f.type === "textarea") {
            return <textarea {...commonProps} />
          }

          if (f.type === "select" && Array.isArray(f.options)) {
            return (
              <select {...commonProps}>
                <option value="">{f.placeholder ?? "— select —"}</option>
                {f.options.map((o: any) => (
                  <option key={o.value ?? o} value={o.value ?? o}>
                    {o.label ?? o}
                  </option>
                ))}
              </select>
            )
          }

          if (f.type === "date") {
            return <input {...commonProps} type="date" />
          }

          if (f.type === "password") {
            return <input {...commonProps} type="password" />
          }

          if (f.type === "number") {
            return <input {...commonProps} type="number" />
          }

          // default -> text
          return <input {...commonProps} type="text" />
        })}

        {Object.keys(errors).length > 0 && (
          <div style={{ color: "red", marginTop: 8 }}>
            {Object.values(errors).map((m, i) => <div key={i}>{m}</div>)}
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={handleSubmit} disabled={saving} style={saveBtn}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000
}

const modal: React.CSSProperties = {
  background: "white",
  padding: 24,
  borderRadius: 8,
  width: 420,
  maxWidth: "95%",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginBottom: 10,
  border: "1px solid #ccc",
  borderRadius: 4
}

const cancelBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#eee",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
}

const saveBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#8B1A1A",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600
}