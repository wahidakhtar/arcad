import Button from "./Button"
import Modal from "./Modal"

export default function ConfirmCancelTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  error?: string
}) {
  return (
    <Modal open={isOpen} title="Cancel Transaction" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-jscolors-text/70">Cancel this transaction? This cannot be undone.</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" className="flex-1" disabled={isLoading} onClick={onConfirm}>
            {isLoading ? "Cancelling..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
