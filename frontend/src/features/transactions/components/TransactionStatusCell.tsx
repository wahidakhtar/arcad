import BadgeDropdown from "../../../components/ui/BadgeDropdown"
import type { BadgeOption } from "../../../components/ui/BadgeDropdown"
import Button from "../../../components/ui/Button"
import { txStatusLabel } from "../../sites/siteDetailHelpers"
import type { BadgeEntry, TransitionEntry, TxRow } from "../hooks/useTransactionsPage"

type TransactionStatusCellProps = {
  row: TxRow
  badgeById: Map<number, BadgeEntry>
  transitions: TransitionEntry[]
  canRequestWrite: boolean
  canTransactionWrite: boolean
  transitioning: number | null
  onApplyTransition: (txId: number, toId: number, version: number) => void
  onOpenExecutionModal: (row: TxRow, toId: number) => void
  onOpenCancel: (row: TxRow) => void
}

export default function TransactionStatusCell({
  row,
  badgeById,
  transitions,
  canRequestWrite,
  canTransactionWrite,
  transitioning,
  onApplyTransition,
  onOpenExecutionModal,
  onOpenCancel,
}: TransactionStatusCellProps) {
  const isReq = row.status_key === "req"
  const currentBadgeEntry = badgeById.get(row.status_id)
  const displayLabel = txStatusLabel(row.type_key, row.status_key, row.status_label)
  const currentBadge = { label: displayLabel, color: currentBadgeEntry?.color ?? null }
  const options: BadgeOption[] = []

  if (isReq && canTransactionWrite) {
    for (const transition of transitions.filter((item) => item.from_id === row.status_id)) {
      const badgeEntry = badgeById.get(transition.to_id)
      const optionLabel = transition.to_key === "exct"
        ? txStatusLabel(row.type_key, "exct", transition.to_label)
        : transition.to_label
      options.push({ id: transition.to_id, label: optionLabel, color: badgeEntry?.color ?? null })
    }
  }

  return (
    <div className="flex items-center gap-2 pl-4">
      <BadgeDropdown
        badge={currentBadge}
        options={options}
        onSelect={(toId) => {
          const entry = badgeById.get(toId)
          if (entry?.key === "exct" && row.type_key !== "b_sur" && row.type_key !== "e_sur") {
            onOpenExecutionModal(row, toId)
            return
          }
          onApplyTransition(row.id, toId, row.version)
        }}
        disabled={transitioning === row.id}
      />
      {isReq && canRequestWrite ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="rounded-xl py-1"
          onClick={() => onOpenCancel(row)}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  )
}
