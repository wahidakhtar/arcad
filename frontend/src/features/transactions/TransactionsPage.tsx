import Button from "../../components/ui/Button"
import ExecutionDateModal from "../../components/ui/ExecutionDateModal"
import ListPageLayout from "../../components/layout/ListPageLayout"
import Modal from "../../components/ui/Modal"
import { useAuth } from "../../context/AuthContext"
import TransactionsTable from "./components/TransactionsTable"
import useTransactionActions from "./hooks/useTransactionActions"
import useTransactionsPage from "./hooks/useTransactionsPage"

export default function TransactionsPage() {
  const { can } = useAuth()
  const canRequestWrite = can("request", "write")
  const canTransactionWrite = can("transaction", "write")
  const { rows, badgeById, transitions, cancelBadgeId, loading, error, loadData } = useTransactionsPage()
  const {
    transitionError,
    execModal,
    setExecModal,
    transitioning,
    confirmCancel,
    setConfirmCancel,
    cancelError,
    setCancelError,
    applyTransition,
    doCancel,
  } = useTransactionActions({ cancelBadgeId, onReload: loadData })

  if (loading) {
    return <div className="p-6 text-jscolors-text/50">Loading transactions...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout>
      {transitionError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{transitionError}</p>
      ) : null}

      <ExecutionDateModal
        open={execModal.open}
        title={execModal.title}
        submitting={transitioning === execModal.transaction_id}
        onConfirm={(date) => {
          const { transaction_id, to_id, version } = execModal
          setExecModal((m) => ({ ...m, open: false }))
          void applyTransition(transaction_id, to_id, version, date)
        }}
        onClose={() => setExecModal((m) => ({ ...m, open: false }))}
      />

      <Modal
        open={confirmCancel.open}
        title="Cancel Transaction"
        onClose={() => { setConfirmCancel({ open: false, txId: 0, version: 0 }); setCancelError("") }}
      >
        <div className="space-y-4">
          <p className="text-sm text-jscolors-text/70">Cancel this transaction?</p>
          {cancelError ? <p className="text-sm text-red-600">{cancelError}</p> : null}
          <div className="flex gap-3">
            <Button type="button" className="flex-1" onClick={() => void doCancel(confirmCancel.txId, confirmCancel.version)}>
              Confirm
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setConfirmCancel({ open: false, txId: 0, version: 0 }); setCancelError("") }}
            >
              Back
            </Button>
          </div>
        </div>
      </Modal>

      <TransactionsTable
        rows={rows}
        badgeById={badgeById}
        transitions={transitions}
        canRequestWrite={canRequestWrite}
        canTransactionWrite={canTransactionWrite}
        transitioning={transitioning}
        onApplyTransition={(txId, toId, version) => {
          void applyTransition(txId, toId, version)
        }}
        onOpenExecutionModal={(row, toId) => {
          setExecModal({
            open: true,
            transaction_id: row.id,
            to_id: toId,
            version: row.version,
            title: row.type_key === "ref" ? "Refund Date" : "Execution Date",
          })
        }}
        onOpenCancel={(row) => setConfirmCancel({ open: true, txId: row.id, version: row.version })}
      />
    </ListPageLayout>
  )
}
