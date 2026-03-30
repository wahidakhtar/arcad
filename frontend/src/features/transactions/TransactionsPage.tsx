import { useMemo, useState } from "react"

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
          <TabPill active={activeTab === "site"} onClick={() => setActiveTab("site")}>Site Payments</TabPill>
          <TabPill active={activeTab === "salaried"} onClick={() => setActiveTab("salaried")}>Salaried</TabPill>
          <TabPill active={activeTab === "others"} onClick={() => setActiveTab("others")}>Others</TabPill>
        </div>
      )}
      pagination={pagination}
      onPageChange={setPage}
    >
      <TransactionsTable rows={visibleRows} badgeById={badgeById} />
    </ListPageLayout>
  )
}

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-jscolors-crimson bg-jscolors-crimson text-white"
          : "border-jscolors-crimson/15 bg-white text-jscolors-text hover:border-jscolors-crimson/40"
      }`}
    >
      {children}
    </button>
  )
}
