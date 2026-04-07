import { useMemo } from "react"

import DataTable from "../../../components/ui/DataTable"
import FieldRenderer from "../../../components/ui/FieldRenderer"
import { formatCurrency } from "../../../utils/format"
import { txStatusLabel } from "../../sites/siteDetailHelpers"
import type { BadgeEntry, TxRow } from "../hooks/useTransactionsPage"

type TransactionsTableProps = {
  rows: TxRow[]
  badgeById: Map<number, BadgeEntry>
}

export default function TransactionsTable({ rows, badgeById }: TransactionsTableProps) {
  const columns = useMemo(() => [
    { key: "recipient_label", label: "Recipient", minWidth: 120 },
    { key: "project_label", label: "Project", minWidth: 120 },
    { key: "ckt_id", label: "Circuit ID", minWidth: 100 },
    { key: "type_label", label: "Type", minWidth: 140 },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      minWidth: 100,
      render: (value: unknown) => <span className="tabular-nums">{formatCurrency(value as number)}</span>,
    },
    {
      key: "status_label",
      label: "Status",
      minWidth: 160,
      render: (_value: unknown, row: Record<string, unknown>) => {
        const txRow = row as unknown as TxRow
        const badge = badgeById.get(txRow.status_id)
        const label = txStatusLabel(txRow.type_key, txRow.status_key, txRow.status_label)
        return <FieldRenderer type="badge" value={{ label, color: badge?.color ?? null }} />
      },
    },
  ], [badgeById])

  return (
    <DataTable
      columns={columns}
      rows={rows as unknown as Record<string, unknown>[]}
      rowHref={(row) => `/transactions/${(row as unknown as TxRow).id}`}
    />
  )
}
