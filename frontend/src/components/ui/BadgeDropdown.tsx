import { useState } from "react"

interface BadgeOption {
  id: number
  description: string
  color: string
}

interface Props {
  valueId: number | null
  label: string | null
  color: string | null
  options: BadgeOption[]
  canToggle: boolean
  onChange: (id: number) => void
}

export default function BadgeDropdown({
  valueId,
  label,
  color,
  options,
  canToggle,
  onChange,
}: Props) {

  const [open, setOpen] = useState(false)

  // ---- READ ONLY ----
  if (!canToggle) {
    return (
      <div
        style={{
          background: color || "#999",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          display: "inline-block",
        }}
      >
        {label || ""}
      </div>
    )
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          background: color || "#999",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        {label || ""}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            background: "white",
            border: "1px solid #ccc",
            marginTop: 4,
            zIndex: 1000,
            minWidth: 120,
          }}
        >
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => {
                onChange(opt.id)
                setOpen(false)
              }}
              style={{
                background: opt.color,
                color: "white",
                padding: "6px 8px",
                cursor: "pointer",
              }}
            >
              {opt.description}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
