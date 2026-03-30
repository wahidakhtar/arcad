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
    <Modal
      isOpen={isOpen}
      title="Cancel Transaction"
      onClose={onClose}
      size="sm"
      submitLabel="Confirm"
      submitVariant="danger"
      onSubmit={onConfirm}
      isSubmitting={isLoading}
    >
      <div className="space-y-3">
        <p className="text-sm text-jscolors-text/70">Cancel this transaction? This cannot be undone.</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  )
}
