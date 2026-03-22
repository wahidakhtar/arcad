import { useEffect, useState } from "react"
import Modal from "./Modal"

const TODAY = new Date().toISOString().slice(0, 10)

/**
 * Shared execution-date confirmation modal.
 * Renders as a fixed overlay (via Modal) above all page content.
 * Resets the date to today each time it opens.
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

  return (
    <Modal open={open} title="Set Execution Date" onClose={onClose}>
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
    </Modal>
  )
}
