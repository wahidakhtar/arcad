import { useMemo } from "react"

import DataTable from "../../../components/ui/DataTable"
import { formatCurrency } from "../../../utils/format"
import type { BadgeEntry, TransitionEntry, TxRow } from "../hooks/useTransactionsPage"
import TransactionStatusCell from "./TransactionStatusCell"

type TransactionsTableProps = {
  rows: TxRow[]
  badgeById: Map<number, BadgeEntry>
  transitions: TransitionEntry[]
  canRequestWrite: boolean
  canTransactionWrite: boolean
  transitioning: number | null
  onApplyTransition: (txId: number, toId: number, version: number) => void
  onOpenExecutionModal: (row: TxRow, toId: number) => void
  onOpenCancel: (row: TxRow) => void
}

export default function TransactionsTable({
  rows,
  badgeById,
  transitions,
  canRequestWrite,
  canTransactionWrite,
  transitioning,
  onApplyTransition,
  onOpenExecutionModal,
  onOpenCancel,
}: TransactionsTableProps) {
  const columns = useMemo(() => [
    { key: "recipient_label", label: "Recipient", minWidth: 120 },
    { key: "project_label", label: "Project", minWidth: 120 },
    { key: "ckt_id", label: "Site", minWidth: 100 },
    { key: "type_label", label: "Type", minWidth: 140 },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      minWidth: 100,
      render: (value: unknown) => <div className="text-right">{formatCurrency(value as number)}</div>,
    },
    {
      key: "status_label",
      label: "Status",
      minWidth: 180,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <TransactionStatusCell
          row={row as unknown as TxRow}
          badgeById={badgeById}
          transitions={transitions}
          canRequestWrite={canRequestWrite}
          canTransactionWrite={canTransactionWrite}
          transitioning={transitioning}
          onApplyTransition={onApplyTransition}
          onOpenExecutionModal={onOpenExecutionModal}
          onOpenCancel={onOpenCancel}
        />
      ),
    },
  ], [badgeById, transitions, canRequestWrite, canTransactionWrite, transitioning, onApplyTransition, onOpenExecutionModal, onOpenCancel])

  return (
    <DataTable
      columns={columns}
      rows={rows as unknown as Record<string, unknown>[]}
    />
  )
}
