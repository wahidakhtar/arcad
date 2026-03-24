import { useEffect, useState } from "react"

import Button from "./Button"
import Modal from "./Modal"

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
  title = "Set Execution Date",
  submitting,
  onConfirm,
  onClose,
}: {
  open: boolean
  title?: string
  submitting: boolean
  onConfirm: (date: string) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(TODAY)

  useEffect(() => {
    if (open) setDate(TODAY)
  }, [open])

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="md"
      footer={(
        <div className="flex gap-3">
          <Button
            type="button"
            className="flex-1"
            disabled={submitting}
            onClick={() => onConfirm(date)}
          >
            Confirm Execution
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Back
          </Button>
        </div>
      )}
    >
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
      </div>
    </Modal>
  )
}
