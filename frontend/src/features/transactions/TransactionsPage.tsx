import { useMemo, useState } from "react"

import Button from "../../components/ui/Button"
import ListPageLayout from "../../components/layout/ListPageLayout"
import TransactionsTable from "./components/TransactionsTable"
import useTransactionsPage from "./hooks/useTransactionsPage"

export default function TransactionsPage() {
  const { rows, badgeById, loading, error, page: _page, setPage, pagination } = useTransactionsPage()
  const [activeTab, setActiveTab] = useState<"site" | "salaried" | "others">("site")

  const visibleRows = useMemo(
    () => rows.filter((row) => row.tab_key === activeTab),
    [activeTab, rows],
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
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "site" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("site")}>Site Payments</Button>
          <Button variant={activeTab === "salaried" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("salaried")}>Salaried</Button>
          <Button variant={activeTab === "others" ? "primary" : "secondary"} size="sm" onClick={() => setActiveTab("others")}>Others</Button>
        </div>
      )}
      pagination={pagination}
      onPageChange={setPage}
    >
      <TransactionsTable rows={visibleRows} badgeById={badgeById} />
    </ListPageLayout>
  )
}

