import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export type BadgeOption = {
  id: number
  label: string
  color: string | null
}

/** Shared chip rendering — identical to FieldRenderer type="badge" */
export function BadgeChip({
  label,
  color,
  fallback = "-",
}: {
  label?: string | null
  color?: string | null
  fallback?: string
}) {
  const text = label ?? fallback
  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: color ? `${color}22` : "rgba(139, 26, 26, 0.10)",
        color: color ?? "#8B1A1A",
      }}
    >
      {text}
    </span>
  )
}

type Props = {
  /** Current badge shown as the trigger. Null renders fallback text. */
  badge: { label: string; color: string | null } | null
  /** Text shown when badge is null */
  fallback?: string
  /** Available transition options */
  options: BadgeOption[]
  onSelect: (id: number) => void
  /** Prevents opening; renders as static chip */
  disabled?: boolean
}

/**
 * Badge chip that acts as its own dropdown trigger.
 * Opens a floating list of badge-styled options via a React portal.
 * When disabled or options is empty, renders as a plain static chip.
 */
export default function BadgeDropdown({
  badge,
  fallback = "-",
  options,
  onSelect,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return
      if (popRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const chip = <BadgeChip label={badge?.label} color={badge?.color} fallback={fallback} />

  if (disabled || !options.length) {
    return chip
  }

  function toggle() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen((v) => !v)
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} className="block">
        {chip}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="flex flex-col gap-1 rounded-[18px] border border-jscolors-crimson/10 bg-white p-2 shadow-lg"
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSelect(opt.id)
                }}
                className="whitespace-nowrap"
              >
                <BadgeChip label={opt.label} color={opt.color} />
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
