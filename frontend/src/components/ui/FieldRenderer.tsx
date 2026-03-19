export type FieldDefinition = {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: Array<{ label: string; value: string | number }>
}

type FieldRendererProps =
  | {
      mode?: "display"
      field?: FieldDefinition
      type?: string
      value: unknown
    }
  | {
      mode: "input"
      field: FieldDefinition
      value: string | boolean
      onChange: (value: string | boolean) => void
      onFocus?: () => void
      className?: string
    }

export default function FieldRenderer(props: FieldRendererProps) {
  if (props.mode === "input") {
    const { field, value, onChange, onFocus, className } = props
    const inputClassName = className ?? "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none transition focus:border-jscolors-crimson/40"

    if (field.type === "bool") {
      return (
        <span className="flex h-[50px] items-center rounded-2xl border border-jscolors-crimson/15 bg-white px-4">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 accent-jscolors-crimson"
          />
        </span>
      )
    }

    if ((field.type === "select" || field.type === "dropdown") && field.options?.length) {
      return (
        <select
          value={String(value ?? "")}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
          required={field.required}
        >
          <option value="">{`Select ${field.label}`}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
        value={String(value ?? "")}
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        required={field.required}
      />
    )
  }

  const type = props.type ?? props.field?.type
  const value = props.value

  if (type === "badge") {
    if (value && typeof value === "object" && "label" in value) {
      const badge = value as { label: string; color?: string | null }
      return (
        <span
          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: badge.color ? `${badge.color}22` : "rgba(139, 26, 26, 0.10)",
            color: badge.color ?? "#8B1A1A",
          }}
        >
          {badge.label}
        </span>
      )
    }
    return <span className="inline-flex rounded-full bg-jscolors-crimson/10 px-3 py-1 text-xs font-semibold text-jscolors-crimson">{String(value ?? "-")}</span>
  }

  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>
  }

  if (value == null || value === "") {
    return <span className="text-jscolors-text/35">-</span>
  }

  return <span>{String(value)}</span>
}
