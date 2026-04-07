import { useMemo, useState } from "react"

import Button from "../../components/ui/Button"
import ListPageLayout from "../../components/layout/ListPageLayout"
import TransactionsTable from "./components/TransactionsTable"
import useTransactionsPage from "./hooks/useTransactionsPage"
import { exportToExcel } from "../../utils/exportToExcel"
import { txStatusLabel } from "../sites/siteDetailHelpers"
import { formatCurrency } from "../../utils/format"

const TX_COLUMNS = [
  { key: "recipient_label", label: "Recipient" },
  { key: "project_label", label: "Project" },
  { key: "ckt_id", label: "Circuit ID" },
  { key: "type_label", label: "Type" },
  { key: "amount_display", label: "Amount", align: "right" as const },
  { key: "status_display", label: "Status" },
]

export default function TransactionsPage() {
  const { rows, badgeById, loading, error, page: _page, setPage, pagination } = useTransactionsPage()
  const [activeTab, setActiveTab] = useState<"site" | "salaried" | "others">("site")

  const visibleRows = useMemo(
    () => rows.filter((row) => row.tab_key === activeTab),
    [activeTab, rows],
  )

  const exportRows = useMemo(
    () => visibleRows.map((row) => {
      const badge = badgeById.get(row.status_id)
      const statusLabel = txStatusLabel(row.type_key, row.status_key, row.status_label)
      return {
        ...row,
        amount_display: String(formatCurrency(row.amount as number)),
        status_display: badge
          ? { label: statusLabel, color: badge.color }
          : statusLabel,
      }
    }),
    [visibleRows, badgeById],
  )

  if (loading && rows.length === 0) {
    return <div className="p-6 text-jscolors-text/50">Loading transactions...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout
      filters={(
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={activeTab === "site" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("site")}>Site Payments</Button>
          <Button variant={activeTab === "salaried" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("salaried")}>Salaried</Button>
          <Button variant={activeTab === "others" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("others")}>Others</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void exportToExcel(
                `transactions_${activeTab}`,
                activeTab === "site" ? "Site Payments" : activeTab === "salaried" ? "Salaried" : "Others",
                TX_COLUMNS,
                exportRows as unknown as Record<string, unknown>[],
              )
            }}
          >
            Export
          </Button>
        </div>
      )}
      pagination={pagination}
      onPageChange={setPage}
    >
      <TransactionsTable rows={visibleRows} badgeById={badgeById} />
    </ListPageLayout>
  )
}
