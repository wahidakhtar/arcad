import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const TODAY = new Date().toISOString().slice(0, 10)

/**
 * Shared execution-date confirmation modal.
 * Renders via createPortal into document.body — completely outside any
 * component tree, so CSS transforms / clip-path on parents cannot clip it.
 * Backdrop: position fixed, inset 0, z-index 9999 — covers full viewport
 * including sidebar.
 */
export default function ExecutionDateModal({
  open,
  submitting,
  onConfirm,
  onClose,
}: {
  open: boolean
  submitting: boolean
  onConfirm: (date: string) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(TODAY)

  useEffect(() => {
    if (open) setDate(TODAY)
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
        className="glass-panel w-full max-w-md p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">Set Execution Date</h2>
          <button type="button" onClick={onClose} className="premium-button-secondary">
            Close
          </button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">
              Execution Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className="premium-button flex-1"
              disabled={submitting}
              onClick={() => onConfirm(date)}
            >
              Confirm Execution
            </button>
            <button
              type="button"
              className="premium-button-secondary flex-1"
              onClick={onClose}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
