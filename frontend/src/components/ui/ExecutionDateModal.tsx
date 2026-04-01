import { useEffect, useState } from "react"

import Modal from "./Modal"

const TODAY = new Date().toISOString().slice(0, 10)

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
      isOpen={open}
      title={title}
      onClose={onClose}
      size="md"
      submitLabel="Confirm Execution"
      onSubmit={() => onConfirm(date)}
      isSubmitting={submitting}
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
            max={TODAY}
          />
        </label>
      </div>
    </Modal>
  )
}
