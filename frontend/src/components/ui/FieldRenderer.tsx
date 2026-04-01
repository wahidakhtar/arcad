import type { KeyboardEvent as ReactKeyboardEvent } from "react"

import BadgeDropdown from "./BadgeDropdown"
import SelectInput from "./SelectInput"
import { formatDate } from "../../utils/format"

const TODAY = new Date().toISOString().slice(0, 10)

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
      onBlur?: () => void
      onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void
      autoFocus?: boolean
      className?: string
    }

export default function FieldRenderer(props: FieldRendererProps) {
  if (props.mode === "input") {
    const { field, value, onChange, onFocus, onBlur, onKeyDown, autoFocus, className } = props
    const sanitizeIdentifier = (nextValue: string) => {
      if (!["ckt_id", "po_number", "invoice_number"].includes(field.key)) return nextValue
      return nextValue.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
    }
    const inputClassName = className ?? "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none transition focus:border-jscolors-crimson/40"

    if (field.type === "bool") {
      const checked = Boolean(value)
      return (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={checked}
            autoFocus={autoFocus}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 accent-jscolors-crimson"
          />
          <span className="text-sm font-medium text-jscolors-text">{checked ? "Required" : "Not Required"}</span>
        </label>
      )
    }

    if ((field.type === "select" || field.type === "dropdown") && field.options?.length) {
      return (
        <SelectInput
          value={String(value ?? "")}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onChange={(event) => onChange(sanitizeIdentifier(event.target.value))}
          className={inputClassName}
          required={field.required}
        >
          <option value="">{`Select ${field.label}`}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      )
    }

    return (
      <input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
        value={String(value ?? "")}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(sanitizeIdentifier(event.target.value))}
        className={inputClassName}
        required={field.required}
        max={field.type === "date" ? TODAY : undefined}
      />
    )
  }

  const type = props.type ?? props.field?.type
  const value = props.value

  if (type === "badge") {
    if (value && typeof value === "object" && "label" in value) {
      const badge = value as { label: string; color?: string | null }
      return (
        <BadgeDropdown
          badge={{ label: badge.label, color: badge.color ?? null }}
          options={[]}
          onSelect={() => {}}
          disabled
        />
      )
    }
    return (
      <BadgeDropdown
        badge={value == null ? null : { label: String(value ?? "-"), color: null }}
        fallback={String(value ?? "-")}
        options={[]}
        onSelect={() => {}}
        disabled
      />
    )
  }

  if (type === "date" && typeof value === "string") {
    return <span>{formatDate(value)}</span>
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
    return <span>{formatDate(value.slice(0, 10))}</span>
  }

  if (typeof value === "boolean") {
    return <span>{value ? "Required" : "Not Required"}</span>
  }

  if (value == null || value === "") {
    return <span className="text-jscolors-text/35">-</span>
  }

  return <span>{String(value)}</span>
}
